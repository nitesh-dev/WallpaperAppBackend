import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import { OrderBy, createApi } from 'unsplash-js';
import * as nodeFetch from 'node-fetch';
import { CollectionRawData, ProcessStack, WallpaperCategoryData, WallpaperData } from './DataType';
import { loadFile, saveFile, submitReport } from './FileHandling.js';
import { Collections } from 'unsplash-js/dist/methods/search/types/response';
import { delay } from './Utils.js';
import MongoAPI from './Mongo.js'




dotenv.config()

const atlas = process.env.ATLAS_URI || '';
const port = process.env.EXPRESS_PORT || 3001;
const unsplashApiKey1 = process.env.UNSPLASH_API_KEY1 || '';
const unsplashApiKey2 = process.env.UNSPLASH_API_KEY2 || '';
const unsplashApiKey3 = process.env.UNSPLASH_API_KEY3 || '';
const unsplashApiKey4 = process.env.UNSPLASH_API_KEY4 || '';
const unsplashApiKey5 = process.env.UNSPLASH_API_KEY5 || '';
const unsplashApiKey6 = process.env.UNSPLASH_API_KEY6 || '';

const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const mongoApi = new MongoAPI()
let isMongoConnected = await mongoApi.connectMongoose(atlas)


// connecting to unsplash
let unsplash = createApi({
  accessKey: unsplashApiKey1,
  fetch: nodeFetch.default as unknown as typeof fetch,
});


const apiChangePerCount = 45
let currentCount = 0
function changeUnsplashApi() {

  currentCount += 1

  if (currentCount > 270) currentCount = 1
  console.log("Request no: " + currentCount)

  if (currentCount <= apiChangePerCount) {
    if (currentCount == 1) {
      unsplash = createApi({
        accessKey: unsplashApiKey1,
        fetch: nodeFetch.default as unknown as typeof fetch,
      });
    }

  } else if (currentCount <= apiChangePerCount * 2) {
    if (currentCount == apiChangePerCount + 1) {
      unsplash = createApi({
        accessKey: unsplashApiKey2,
        fetch: nodeFetch.default as unknown as typeof fetch,
      });
    }

  } else if (currentCount <= apiChangePerCount * 3) {
    if (currentCount == apiChangePerCount * 2 + 1) {
      unsplash = createApi({
        accessKey: unsplashApiKey3,
        fetch: nodeFetch.default as unknown as typeof fetch,
      });
    }

  } else if (currentCount <= apiChangePerCount * 4) {
    if (currentCount == apiChangePerCount * 3 + 1) {
      unsplash = createApi({
        accessKey: unsplashApiKey4,
        fetch: nodeFetch.default as unknown as typeof fetch,
      });
    }

  } else if (currentCount <= apiChangePerCount * 5) {
    if (currentCount == apiChangePerCount * 4 + 1) {
      unsplash = createApi({
        accessKey: unsplashApiKey5,
        fetch: nodeFetch.default as unknown as typeof fetch,
      });
    }

  } else if (currentCount <= apiChangePerCount * 6) {
    if (currentCount == apiChangePerCount * 5 + 1) {
      unsplash = createApi({
        accessKey: unsplashApiKey6,
        fetch: nodeFetch.default as unknown as typeof fetch,
      });
    }
  }
}

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



// -------------------- Public Request -----------------------------

// https://images.unsplash.com/photo-1687626835694-2b7c6a352f1b?ixid=2yJhcHBfaWQiOjEyMDd9&fm=jpg&fit=crop&w=720&h=20000&q=40

app.get('/public/category', async (req, res) => {
  const result = await mongoApi.getCollections()
  if (result == null) {
    res.status(500).send("Server Internal Error")
  } else {
    res.status(200).json(result)
  }
})


app.get('/public/wallpapers', async (req, res) => {
  try {
    const collectionId = req.query.id as string
    const page = parseInt(req.query.page as string)

    if (page < 1) throw "page index must be greater than 0"
    const result = await mongoApi.getWallpapers(collectionId, page)

    if (result == null) {
      res.status(500).send("Server Internal Error")
    } else {
      res.status(200).json(result)
    }

  } catch (error) {

    console.log(error)
    res.status(400).send("Bad Request")
  }
})

app.get('/public/wallpaper/:id', async (req, res) => {
  try {

    const result = await mongoApi.findWallpaper(req.params.id)

    if (result == null) {
      res.status(404).send("Not Found")
    } else {
      res.status(200).json(result)
    }

  } catch (error) {

    console.log(error)
    res.status(400).send("Bad Request")
  }
})

app.get('/public/wallpaper/search/:query/:page', async (req, res) => {
  try {
    const page = parseInt(req.params.page as string)
    if (page < 1) throw "page index must be greater than 0"

    const result = await mongoApi.searchWallpapers(req.params.query, page)

    if (result == null) {
      res.status(404).send("Not Found")
    } else {
      res.status(200).json(result)
    }

  } catch (error) {

    console.log(error)
    res.status(400).send("Bad Request")
  }
})









// --------------------- Testing Request -----------------------------

app.get('/', (req, res) => {
  res.send('Server is working')
})




// ------------------------ Server side request ----------------------
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



app.get('/latest', async (req, res) => {

  let collections = await unsplash.collections.list({})

  if (collections.response != undefined) {
    res.json(collections)
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
let isOver = false;

app.get('/start', async (req, res) => {
  console.log("fetching start request")

  if (isOver == true) {
    res.send("Collection Over")
    return
  }

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

  try {
    // do until all collection not over
    while (true) {

      // break the loop if not allowed
      if (isStarting == false) {
        console.log("Fetching stopped successfully")
        return
      }


      // fetching next wallpaper data
      changeUnsplashApi()

      let data = await fetchNextPhotos()
      console.log("fetched data: " + data.count + "  Result: " + data.wallpapers.length + "    page: " + data.page)

      // close the loop if collection is empty
      if (data.count == 0) {
        console.log('Collection over')
        isOver = true
        isStarting = false
        return
      }

      // saving to mongo
      console.log("Sending to mongo...")

      // create collection if it is first page of collection
      if (data.isFirst == true) {

        // making title first letter capital
        let title = progressQuery.categoriesName[data.index].toLowerCase()
        title = title.charAt(0).toUpperCase() + title.slice(1)


        let categoryRawData = progressQuery.collections[data.index]

        let category: WallpaperCategoryData = {
          _id: categoryRawData.id,
          title: title,
          cover_photo: categoryRawData.cover_photo,
          blur_hash: categoryRawData.blur_hash
        }

        if (await mongoApi.createCollection(category) == false) {

          console.log("Fetching stopped due to error")
          isStarting = false
          return
        }
      }

      // add wallpapers to server and close the loop if error occurs
      if (await mongoApi.addWallpapers(data.wallpapers) == false) {

        console.log("Fetching stopped due to error")
        isStarting = false
        return
      }


      progressQuery.photoIndex += data.count
      await saveFile(progressQuery)

      // wait for 14 seconds
      console.log("Delaying...")
      await delay(14)

    }
  } catch (error) {
    isStarting = false
    submitReport(error + "")
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
      page: 0,
      index: -1,
      isFirst: false,
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
        category_id: currentFetchCollection.categoryId,
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
    page: currentFetchCollection.page,
    index: currentFetchCollection.index,
    isFirst: currentFetchCollection.isFirst
  }
}

function findCurrentFetchingCollection(currentPos: number) {
  let data = {
    name: '',
    collectionId: '',
    categoryId: '',
    page: 0,
    count: 0,
    index: -1,
    isFirst: false
  }

  let totalCount = 0
  let index = -1;

  for (const collection of progressQuery.collections) {
    index += 1
    data.name = collection.title
    data.categoryId = collection.id

    let loopCount = 0
    for (const sub of collection.sub_collection) {
      totalCount += sub.count
      loopCount += 1

      if (currentPos < totalCount) {
        data.collectionId = sub.id

        // notify that to create category, if it is first sub collection
        if(loopCount == 1) data.isFirst = true

        // photo index relative to sub collection
        let relPhotoIndex = (currentPos - (totalCount - sub.count))

        console.log("RelPhotoIndex: " + relPhotoIndex)
        // find page number
        let page = Math.floor(relPhotoIndex / 30) + 1

        // calculating fetch count
        let fetchCount = sub.count - relPhotoIndex
        if (fetchCount > 30) fetchCount = 30

        data.index = index
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
