import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import { createApi } from 'unsplash-js';
import * as nodeFetch from 'node-fetch';
import { CollectionRawData, ProcessStack, WallpaperData } from './DataType';
import { loadFile, saveFile } from './FileHandling.js';
import { Collections } from 'unsplash-js/dist/methods/search/types/response';
import { delay } from './Utils.js';
import MongoAPI from './Mongo.js'




dotenv.config()

const atlas = process.env.ATLAS_URI || '';
const port = process.env.EXPRESS_PORT || 3001
const unsplashApiKey = process.env.UNSPLASH_API_KEY || ''

const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const mongoApi = new MongoAPI()
let isMongoConnected = await mongoApi.connectMongoose(atlas)


// connecting to unsplash
const unsplash = createApi({
  accessKey: unsplashApiKey,
  fetch: nodeFetch.default as unknown as typeof fetch,
});



// ------------------------ temp data --------------------
// only called on project setup

// const temp: ProcessStack = {
//   photoIndex: 0,
//   categoriesName: [],
//   collections: []
// }

// await saveFile(temp)




const premiumPerPage = 3
const maxPhotoCount = 5000
const progressQuery: ProcessStack = await loadFile()


// --------------------- middleware ---------------------------

app.use((req, res, next) => {
  if (!isMongoConnected) {
    res.status(503).send("Database connection error")
  } else {
    next()
  }
})









// --------------------- Testing Request -----------------------------

app.get('/', (req, res) => {
  res.send('Server is working')
})

app.get('/collections/:name', async (req, res) => {

  let collections = await unsplash.search.getCollections({
    query: req.params.name,
    page: 2,
    perPage: 15
  })


  if (collections.response != undefined) {

    res.send(collectCategoryData(collections.response))
  }
  else {
    res.send('Not found')
  }
})


app.get('/collections/photos/:id', async (req, res) => {

  let collections = await unsplash.collections.getPhotos({
    collectionId: req.params.id,
    page: 1,
    perPage: 30
  })

  if (collections.response != undefined) {
    res.json(collections.response!!.results)
  } else {
    res.send('Not found')
  }
})






// ---------------------------------------------------------------------

app.get('/add/collections/:name', async (req, res) => {
  let collections = await unsplash.search.getCollections({
    query: req.params.name,
    page: 1,
    perPage: 15
  })


  if (collections.response != undefined) {
    let data = collectCategoryData(collections.response)
    progressQuery.categoriesName.push(data.title)
    progressQuery.collections = progressQuery.collections.concat(data)
    saveFile(progressQuery)
    res.send("Successfully added")
  }
  else {
    res.send('Not found')
  }
})


app.get('/photos', async (req, res) => {
  let data = await fetchNextPhotos()
  res.send(data)
})



let isStarting = false;

app.get('/start', async (req, res) => {
  console.log("fetching start request")

  if (isStarting == false) {
    isStarting = true
    startFetchAndUpload()
    res.send("Started")
  } else {
    res.send("Already started")
  }

})

app.get('/stop', async (req, res) => {
  console.log("stop request sended")

  isStarting = false
  res.send("Stopping")
})







// ---------------------------------------------------

async function startFetchAndUpload() {

  // do until all collection not over
  while (true) {

    // break the loop if not allowed
    if (isStarting == false) {
      console.log("Fetching stopped successfully")
      return
    }


    // fetching next wallpaper data
    let data = await fetchNextPhotos()
    console.log("fetched data: " + data.count + "  Result: " + data.wallpapers.length + "    page: " + data.page)

    // close the loop if collection is empty
    if (data.count == 0) {
      console.log('Collection over')
      return
    }

    // saving to mongo
    console.log("Sending to mongo...")
    const status = await mongoApi.addWallpapers(data.wallpapers)

    // close the loop if error occurs
    if (status == false) {
      console.log("Fetching stopped due to error")
      return
    }


    progressQuery.photoIndex += data.count
    await saveFile(progressQuery)

    // wait for 30 seconds code here
    console.log("Delaying...")
    await delay(10)

  }
}


// return true when photo fetch available otherwise false
async function fetchNextPhotos() {

  const currentFetchCollection = findCurrentFetchingCollection(progressQuery.photoIndex)
  let photoCollection = Array<WallpaperData>()

  if (currentFetchCollection == null) {
    console.log('collection over')
    return {
      wallpapers: photoCollection,
      count: 0,
      page: 0
    }
  }

  let photos = await unsplash.collections.getPhotos({
    collectionId: currentFetchCollection.collectionId,
    page: currentFetchCollection.page,
    perPage: currentFetchCollection.count
  })

  if (photos.response != undefined) {
    let times = 0
    photos.response!!.results.forEach(data => {
      times += 1

      let image_url = data.urls.raw.split('?')[0]

      const wallpaper: WallpaperData = {
        _id: data.id,
        category_id: currentFetchCollection.collectionId,
        created_at: new Date(data.created_at).getTime(),
        width: data.width,
        height: data.height,
        color: data.color,
        blur_hash: data.blur_hash,
        description: data.alt_description,
        image_url: image_url,
        likes: data.likes,
        is_premium: false
      }

      if (image_url != undefined) {
        photoCollection.push(wallpaper)
      }
    });


    // sorting collection by most likes
    if (photoCollection.length > 5) {
      photoCollection.sort(function (a, b) {
        return b.likes - a.likes;
      })

      // selecting the first 3 as premium
      photoCollection[0].is_premium = true
      photoCollection[1].is_premium = true
      photoCollection[2].is_premium = true
    }
  }


  return {
    wallpapers: photoCollection,
    count: currentFetchCollection.count,
    page: currentFetchCollection.page
  }
}

function findCurrentFetchingCollection(currentPos: number) {
  let data = {
    name: '',
    collectionId: '',
    page: 0,
    count: 0
  }

  let totalCount = 0
  for (const collection of progressQuery.collections) {

    data.name = collection.title
    for (const sub of collection.sub_collection) {
      totalCount += sub.count

      if (currentPos < totalCount) {
        data.collectionId = sub.id

        // photo index relative to sub collection
        let relPhotoIndex = (currentPos - (totalCount - sub.count))

        console.log("RelPhotoIndex: " + relPhotoIndex)
        // find page number
        let page = Math.floor(relPhotoIndex / 30) + 1

        // calculating fetch count
        let fetchCount = sub.count - relPhotoIndex
        if (fetchCount > 30) fetchCount = 30

        data.page = page
        data.count = fetchCount

        return data
      }
    }
  }

  return null
}


function collectCategoryData(collections: Collections) {

  let photos = 0
  let isLimitOverflow = false

  const collectionData: CollectionRawData = {
    id: '',
    title: '',
    cover_photo: '',
    blur_hash: '',
    sub_collection: [],
  }

  for (let index = 0; index < collections.results.length; index++) {
    const data = collections.results[index]

    const coverPhoto = data.cover_photo?.urls.raw.split('?')[0]
    const blurHash = data.cover_photo!!.blur_hash

    if (coverPhoto == undefined || blurHash == null) continue
    if (collectionData.cover_photo == "" || collectionData.blur_hash == "") {
      collectionData.id = data.id
      collectionData.title = data.title
      collectionData.cover_photo = coverPhoto
      collectionData.blur_hash = blurHash
    }

    // removing extra photo fetch
    photos += data.total_photos
    let photoCollectLimit = data.total_photos

    if (photos > maxPhotoCount) {
      photoCollectLimit -= (photos - maxPhotoCount)
      isLimitOverflow = true
    }


    collectionData.sub_collection.push({ id: data.id, count: photoCollectLimit })

    if (isLimitOverflow) {
      console.log("Limit overflow: ", data.total_photos)
      break
    }
  }

  return collectionData
}





app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
