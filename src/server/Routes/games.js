/* Router for handling Game API details

*/

import express from 'express';
import Game from '../Models/Game';
import QueryOptions from '../Models/QueryOptions';
import RoutesUtils from './routeUtils';
import utils from '../../utils';

require('dotenv').config();

const router = express.Router();

function gamesFromData(body, selected) {
  try {
    const gamesArray = body.data.map(game => new Game(game, selected));

    return utils.removeArrayDuplicates(gamesArray, 'id');
  }
  catch (ex) {
    throw ex;
  }
}

router.get('/', (req, res) => {
  res.send('games home');
});

async function getTopGames(uri, params, next) {
  const options = QueryOptions.cleanIncomingQueryOptions('/games/top', params);
  if (options.include_top_games === false) {
    return [];
  }
  const results = await RoutesUtils.commonTwitchRequest({
    uri,
    options,
    rejectErrors: true,
    next
  });
  return gamesFromData(results);
}

async function getSpecificGames(uri, params, next, isSelected = false) {
  const options = QueryOptions.cleanIncomingQueryOptions('/games/specific', params);

  if (!options.game_name && !options.game_id) {
    return [];
  }
  const results = await RoutesUtils.commonTwitchRequest({
    uri,
    options,
    rejectErrors: true,
    next
  });

  return gamesFromData(results, isSelected);
}

async function getTopAndSpecificGames(options, next) {
  // Make the two separate calls to the Twitch API
  const [specificResult, topResult] = [
    await getSpecificGames('/helix/games', options, next, true),
    await getTopGames('/helix/games/top', options, next)
  ];

  return utils.combineArraysWithoutDuplicates(specificResult, topResult, 'id');
}

/* Get details for top games
    Querystring params: first, after
    https://dev.twitch.tv/docs/api/reference/#get-top-games
*/
router.get('/top', async (req, res, next) => {
  try {
    const results = await getTopGames('/helix/games/top', req.query, next);
    res.send(results || []);
  }
  catch (err) {
    next(err);
  }
});

/*  Get details for specific games
    Querystring params: id, name
    https://dev.twitch.tv/docs/api/reference/#get-games
*/
router.get('/specific', async (req, res, next) => {
  try {
    const results = await getSpecificGames('/helix/games', req.query, next, true);
    res.send(results);
  }
  catch (err) {
    next(err);
  }
});

router.get('/combo', async (req, res, next) => {
  try {
    const options = QueryOptions.cleanIncomingQueryOptions('/games/combo', req.query);

    if (!options.game_id && !options.game_name && !options.include_top_games) {
      res.send([]);
    }
    else {
      const results = await getTopAndSpecificGames(options, next);
      res.send(results);
    }
  }
  catch (err) {
    next(err);
  }
});

module.exports = {
  router,
  getTopGames,
  getSpecificGames,
  getTopAndSpecificGames
};
