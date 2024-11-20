const {testDbConnection} = require('../db');
const {logger,sendMetric} = require('../logger');


exports.healthz = async (req,res) => {
    const startTime = Date.now();
    sendMetric("APICallCount", 1, req.url, req.method, "Count");
    
    //Cache control set to no cache
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    logger.logInfo(req.method,req.url,'Setting response to no cache');

    //Reject non "get" request
    if (req.method != "GET"){
        logger.logError(req.method,req.url,'Facing invalid method for api request');

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        res.status(405).send();
    }

    //Reject request with query params, payload and wrong file type
    if (req.headers["content-length"]  || !(req.url==="/healthz" || req.url==="/healthz/") || (
            req.headers["content-type"] != "application/json" &&
            req.headers["content-type"] != undefined
        )
    ) {
        logger.logError(req.method,req.url,'Facing invalid body for api request');

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        res.status(400).send();
    }

    //Check for db connection
    if (!req.headers["content-length"]){  //Sanity check
        const dbStartTime = Date.now();
        const reply = await testDbConnection();
        sendMetric("DbConnectionLatency", Date.now() - dbStartTime, req.url, req.method, "Milliseconds");

        if (reply){
            logger.logInfo(req.method,req.url,'Successful API request');

            const timeDuration = Date.now() - startTime;
            sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
            res.status(200).send();
        } else{
            logger.logError(req.method,req.url,'DB unavailable for api request');

            const timeDuration = Date.now() - startTime;
            sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
            res.status(503).send();
        }
    } else{
        logger.logError(req.method,req.url,'Facing invalid body/headers for api request');

        const timeDuration = Date.now() - startTime;
        sendMetric("APICallLatency", timeDuration, req.url, req.method, "Milliseconds");
        res.status(400).send();
    }
}
