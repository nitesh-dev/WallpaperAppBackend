import mongoose from "mongoose";
import { WallpaperCategoryData, WallpaperData } from "./DataType";
import { Wallpaper, WallpaperCategory } from "./Model.js";
import { submitReport } from './FileHandling.js';
export default class MongoAPI {

    async connectMongoose(url: string) {
        var isConnected = false
        await mongoose.connect(url)
            .then(() => {
                isConnected = true
                console.log('Connected to MongoDB');
            })
            .catch((error) => {
                console.error('Error connecting to MongoDB:', error);
            });

        return isConnected
    }




    // -------------------- requests ----------------------

    async addWallpapers(wallpapers: Array<WallpaperData>) {
        try {
            const bulkOps = wallpapers.map((wallpaper) => ({
                updateOne: {
                    filter: { _id: wallpaper._id },
                    update: { $set: wallpaper },
                    upsert: true,
                },
            }));

            const result = await Wallpaper.bulkWrite(bulkOps);

            console.log("Wallpapers added to MongoDB:", result);
            return true;
        } catch (error) {

            await submitReport(error + "")
            return false;
        }
    }

    async createCollection(data: WallpaperCategoryData) {

        try {
            const update = data;
            const options = {
                upsert: true
            };

            const result = await WallpaperCategory.findOneAndUpdate({ _id: data._id }, update, options);
            console.log("Document added to MongoDB:", result);

            return true;
        } catch (error) {

            await submitReport(error + "")
            return false;
        }
    }






    /* **************************** Public Request ********************************* */

    async getCollections() {

        try {
            return await WallpaperCategory.find().select('-__v') as Array<WallpaperCategoryData>;
        } catch (error) {

            await submitReport(error + "\nby getCollection()")
            return null;
        }
    }

    async findWallpaper(id: string) {

        try {
            return await Wallpaper.findById(id) as WallpaperData | null;
        } catch (error) {

            await submitReport(error + "\nby findWallpaper()")
            return null;
        }
    }

    async getWallpapers(categoryId: string, page: number) {
        try {
            const pageSize = 30;                    // Number of documents per page
            const skip = (page - 1) * pageSize;     // Calculate the number of documents to skip

            return await Wallpaper.find({ category_id: categoryId })
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(pageSize)
                .select('-__v') as Array<WallpaperData>;

        } catch (error) {

            await submitReport(error + "\nby getWallpapers()")
            return null;
        }
    }


    async searchWallpapers(query: string, page: number) {

        try {
            // code to search
            const pageSize = 30
            const skipCount = (page - 1) * pageSize;

            return await Wallpaper.find(
                { $text: { $search: query } }
            ).sort({ score: { $meta: 'textScore' } })
            .select('-__v')
            .skip(skipCount)
            .limit(pageSize) as Array<WallpaperData>;

        } catch (error) {

            await submitReport(error + "\nby findWallpaper()")
            return null;
        }
    }



    // ------------------ Account -------------------

    // async isAdmin(accountId: string) {
    //     try {
    //         const account = await Account.findById(accountId)
    //         if (account == null) return false
    //         if (account.role == 'CEO' || account.role == 'CO') return true

    //     } catch (error) {
    //         console.log(error)
    //     }

    //     return false
    // }

    // async isAccountExist(accountId: string) {
    //     try {
    //         const account = await Account.findById(accountId)
    //         if (account != null) return true

    //     } catch (error) {
    //         console.log(error)
    //     }

    //     return false
    // }

    // async getAccount(email: string) {
    //     try {
    //         const account = await Account.findOne({ email: email });
    //         console.log("fetch account")
    //         return account;

    //     } catch (error) {
    //         console.error('Error in account:', error);
    //         return null
    //     }
    // }

    // async createAccount(accountData: AccountData) {
    //     try {
    //         const account = await Account.create(accountData)
    //         console.log("create account")
    //         return account

    //     } catch (error) {
    //         console.error('Error in account:', error);
    //         return null
    //     }
    // }

    // async resetAccountPassword(accountId: string, newPassword: string) {
    //     try {
    //         const account = await Account.findByIdAndUpdate(accountId, { password: newPassword })
    //         console.log("reset account password")
    //         return account

    //     } catch (error) {
    //         console.error('Error in account:', error);
    //         return null
    //     }
    // }





}
