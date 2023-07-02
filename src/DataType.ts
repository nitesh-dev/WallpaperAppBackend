

export interface WallpaperData {
    _id: string,
    category_id: string,
    created_at: number,
    width: number,
    height: number,
    color: string,
    blur_hash: string,
    description: string,
    image_url: string,
    likes: number,
    is_premium: boolean
}

export interface WallpaperCategoryData {
    _id: string,
    title: string,
    cover_photo: string,
    blur_hash: string
}

export interface CollectionRawData{
    id: string,
    title: string,
    cover_photo: string,
    blur_hash: string,
    sub_collection: Array<SubCollection>
}

export interface SubCollection{
    id: string,
    count: number
}


export interface ProcessStack{
    photoIndex: number,
    categoriesName: Array<string>,
    collections: Array<CollectionRawData>
}