import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import { createApi } from 'unsplash-js';
import * as nodeFetch from 'node-fetch';
import { CollectionRawData, ProcessStack, Wallpaper } from './DataType';
import { loadFile, saveFile } from './FileHandling.js';
import { ApiResponse } from 'unsplash-js/dist/helpers/response';
import { Collections } from 'unsplash-js/dist/methods/search/types/response';
import { photos } from 'unsplash-js/dist/internals';
import { Full } from 'unsplash-js/dist/methods/users/types';



dotenv.config()

const port = process.env.EXPRESS_PORT || 3001
const unsplashApiKey = process.env.UNSPLASH_API_KEY || ''

const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


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





const maxPhotoCount = 5000
const progressQuery: ProcessStack = await loadFile()


// --------------------- middleware ---------------------------

app.get('/', async (req, res, next) => {
  if (progressQuery == null) {
    res.send('Server internal error')
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
    page: 1,
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







// ---------------------------------------------------


// return true when photo fetch available otherwise false
async function fetchNextPhotos() {

  const currentFetchCollection = findCurrentFetchingCollection(progressQuery.photoIndex)

  if (currentFetchCollection == null) {
    console.log('collection over')
    return false
  }

  let photos = await unsplash.collections.getPhotos({
    collectionId: currentFetchCollection.collectionId,
    page: currentFetchCollection.page,
    perPage: currentFetchCollection.count
  })

  // let pho = await unsplash.photos.get({
  //   photoId: 'Oiye57IAyvI'
  // })


  let photoCollection = Array<Wallpaper>()

  if (photos.response != undefined) {
    photos.response!!.results.forEach(data => {

      let image_url = data.urls.raw.split('?')[0]
      
      const wallpaper: Wallpaper = {
        _id: data.id,
        category_id: '',
        created_at: data.created_at,
        width: data.width,
        height: data.height,
        color: data.color,
        blur_hash: data.blur_hash,
        description: data.alt_description,
        image_url: image_url,
        likes: data.likes,
        is_premium: false
      }

      if(image_url != undefined){
        photoCollection.push(wallpaper)
      }
    });
  }


  return photoCollection
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

        // find page number
        let page = Math.floor(relPhotoIndex / 30)

        // calculating fetch count
        let fetchCount = Math.min(relPhotoIndex + 30, sub.count)

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
    title: '',
    cover_photo: '',
    blur_hash: '',
    sub_collection: []
  }

  for (let index = 0; index < collections.results.length; index++) {
    const data = collections.results[index]

    const coverPhoto = data.cover_photo?.urls.raw.split('?')[0]
    const blurHash = data.cover_photo!!.blur_hash

    if (coverPhoto == undefined || blurHash == null) continue
    if (collectionData.cover_photo == "" || collectionData.blur_hash == "") {
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
