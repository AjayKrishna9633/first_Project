import bcrypt from "bcrypt";

const saltRound= parseInt(process.env.BCRYPT_SALT_ROUNDS)||10;

const hashPassword = async (password)=>{
    if(!password) throw new Error("The password is required for hashing")
        try{
            const hash = await bcrypt.hash(password,saltRound);
            return hash;
        }catch (err){
            console.log("Error hashing password",err);
        throw err;
        }
    }
    const comparePassword = async(plainpassword,hashPassword)=>{
        if(!plainpassword||!hashPassword){
            throw new Error("both plainPassword and confirm password is required");
        }
        try{

            return await bcrypt.compare(plainpassword,hashPassword);

        }catch(err){
            console.log("Error while comparing",err);
            throw err;
        }
    };
    export {
        comparePassword,
        hashPassword
    }