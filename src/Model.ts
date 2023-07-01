import { Schema } from 'mongoose';
import mongoose from 'mongoose';

const wallpaperSchema = new Schema({

    _id: { type: String, required: true },
    category_id: { type: String, required: true },
    created_at: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    color: { type: String, required: false },
    blur_hash: { type: String, required: false },
    description: { type: String, required: false },
    image_url: { type: String, required: false },
    likes: { type: Number, required: false },
    is_premium: { type: Boolean, required: true },
    

});

const wallpaperCategorySchema = new Schema({
    _id: { type: String, required: true },
    title: { type: String, required: false },
    cover_photo: { type: String, required: false },
    blur_hash: { type: String, required: false },
})

export const Wallpaper = mongoose.model("Wallpaper", wallpaperSchema)
export const WallpaperCategory = mongoose.model("WallpaperCategory", wallpaperCategorySchema)


