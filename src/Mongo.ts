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

    async createCollection(data: WallpaperCategoryData){

        try {
            const update = data;
            const options = {
                upsert: true
            };
    
            const result = await WallpaperCategory.findByIdAndUpdate(data._id, update, options)
            console.log("Document added to MongoDB:", result);
            
            return true;
        } catch (error) {

            await submitReport(error + "")
            return false;
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
