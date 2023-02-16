exports = async function (request, response) {

    try {
        let skip = parseInt(request.query.skip);
        let limit = parseInt(request.query.limit);
        // basic query. can be enriched by adding filters or search
        const pipeline = [
            {
                '$sort': {
                    '_id': 1
                }
            }, {
                '$skip': skip
            }, {
                '$limit': limit
            }, {
                '$project': {
                    'ts': 1,
                    'namespace': '$param.ns',
                    'command': '$param.command',
                    'args': '$param.args',
                    'users': 1,
                    'remote': 1
                }
            }
        ];
        //set the service name (cluster names linked to App Service), databaseName and collectionName
        var collection = await context.services.get("cluster0").db("contReview").collection("auditLog");
        var result = await collection.aggregate(pipeline);
        return result;

    } catch (error) {
        console.log("error is",error);
        response.setStatusCode(400);
        response.setBody(error.message);
    }
};
