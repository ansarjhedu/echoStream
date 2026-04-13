
import Store from "../models/Store.js";

const apiKeyAuth=async (req,res,next)=>{
    const apiKey=req.headers["x-api-key"] || req.query.apiKey;
    console.log(apiKey)
  
    if(!apiKey){
        return res.status(401).json({message:"No API key provided, authorization denied"});
    }
    try {
        const store=await Store.findOne({apiKey:apiKey}).select('_id name status isActive  widgetConfig');
        if(!store || !store.isActive || !["live","suspended"].includes(store.status)){
            return res.status(401).json({message:store.status==="suspended"?"Your store is currently suspended, please contact support for more information":"Invalid API key or store is not active, authorization denied"});
        }

        
        req.store=store;
        next();
    }
    catch (error) {
        console.error("API key verification failed",error);
        return res.status(401).json({message:"Invalid API key, authorization denied"});
    }
}
export default apiKeyAuth;