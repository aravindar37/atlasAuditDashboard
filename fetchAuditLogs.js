exports = async function(request, response){
  
  try {
      let dateQuery = new Date();
      let skip = request.query.skip;
      let limit = request.query.limit;
      dateQuery.setDate(dateQuery.getDate() - 1);
      const pipeline = [
      { $match: { createdAt: { $gt: dateQuery } } },
      { $skip: skip},
      { $limit: limit},
      { $project: { ts: 1, namespace: "$param.ns", command: "$param.command", args: "$param.args", users: 1, remote: 1 } } 
      ];
      var collection = await context.services.get("Cluster0").db("contReview").collection("auditLog");
      var result = await collection.aggregate(pipeline);
      
    
      response.setStatusCode(201);
      // tip: You can also use EJSON.stringify instead of JSON.stringify.
      response.setBody(JSON.stringify({
         result
      }));
   } catch (error) {
      response.setStatusCode(400);
      response.setBody(error.message);
   }
};
