const {testDbConnection} = require('../db');


exports.healthz = async (req,res) => {
    
    //Cache control set to no cache
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    //Reject non "get" request
    if (req.method != "GET"){
        res.status(405).send();
    }

    //Reject request with query params, payload and wrong file type
    if (req.headers["content-length"]  || !(req.url==="/healthz" || req.url==="/healthz/") || (
            req.headers["content-type"] != "application/json" &&
            req.headers["content-type"] != undefined
        )
    ) {
        res.status(400).send();
    }

    //Check for db connection
    if (!req.headers["content-length"]){  //Sanity check
        const reply = await testDbConnection();

        if (reply){
            res.status(200).send();
        } else{
            res.status(503).send();
        }
    } else{
        res.status(400).send();
    }
}