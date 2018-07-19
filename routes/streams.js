/**
 * 
 * Helix reference: https://dev.twitch.tv/docs/api/reference/
 * Kraken reference: https://dev.twitch.tv/docs/v5/reference/games/
 */

const request 		= require('request');
const keys 			= require('../keys');
const Stream        = require('../models/stream');
const GameRouter 	= require('./games');


let baseRequest = request.defaults({
	headers: keys.twitch,
	baseUrl: 'https://api.twitch.tv/'
})

module.exports = function(router) {
    
    router.get('/streams/details', (req, res) => {
        queryStreamsDetails(req.query).then(value => res.send(value))
    });

    router.get('/streams/games', (req, res) => {
        queryStreamsForSpecificGames(req.query).then(value => res.send(value))
    });
}
module.exports.queryStreamsDetails = queryStreamsDetails;
module.exports.queryStreamsForSpecificGames = queryStreamsForSpecificGames;

/* Get list of streams for specified games
    Querystring params: game_id, language, first

    WARNING: You can specify either the game, or the streamer. If you do both, it returns an inner join basically (all of the specified people, streaming the specified games)
    https://dev.twitch.tv/docs/api/reference/#get-streams

*/
function queryStreamsForSpecificGames (options) {
    return new Promise((resolve, reject) => {
        baseRequest.get({
            uri: 'helix/streams',
            qs: options
        }, function(error, response, body) {
            if (error) 
                reject(Error(`Error on streamsForSpecificGames, ${error}`))
            else {
                try {
                    resolve(streamsMapFromData(body));
                }
                catch (error) {
                    console.log("Hey that error happened!!! (specific streams)")
                    console.log(body);
                    console.log('---')
                    reject(Error(`Error parsing streamsForSpecificGames, ${error}`));
                }
            }
        })
    })
}

/* Get details for specified users
    Querystring params: id, login
    https://dev.twitch.tv/docs/api/reference/#get-users
*/
function queryStreamsDetails (options) {
    return new Promise((resolve, reject) => {
        baseRequest.get({	
            uri: 'helix/users',
            qs: options
        }, (error, response, body) => {
            if (error) {
                reject(Error(`Error on streamDetails, ${error}`));
            }
            else {
                try {
                    resolve(JSON.parse(body).data.map(stream => {
                        let newStream = new Stream();
                        newStream.user_id = Number(stream.id);
                        newStream.login = stream.login;

                        return newStream;
                    }))
                }
                catch (error) {
                    reject(Error(`Error parsing streamsDetails, ${error}`))
                }
            }
        })
    })
}


function streamsMapFromData (body) {
    try {
        return JSON.parse(body).data.map(stream => new Stream(stream));
    }
    catch (ex) {
        throw (ex);
    }
}