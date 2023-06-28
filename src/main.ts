import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import { createApi } from 'unsplash-js';
import * as nodeFetch from 'node-fetch';


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


// --------------------- middleware ---------------------------



// --------------------- Request -----------------------------

app.get('/', (req, res) => {
  res.send('Server is working')
})

app.get('/collections/:name', async (req, res) => {

  let collections = await unsplash.search.getCollections({
    query: req.params.name,
    page: 1,
    perPage: 10
  })

  if (collections.response != undefined) {
    res.json(collections.response!!)
  } else {
    res.send('Not found')
  }
})

app.get('/collections/photos/:id', async (req, res) => {

  let collections = await unsplash.collections.getPhotos({
    collectionId: req.params.id,
    page: 2,
    perPage: 30
  })

  if (collections.response != undefined) {
    res.json(collections.response!!.results)
  } else {
    res.send('Not found')
  }
})




app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
