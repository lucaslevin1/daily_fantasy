'use strict'

const fs = require('fs'),
      dailyPlayers = JSON.parse(fs.readFileSync('NFL/data/dailyPlayers.json')),
      projPoints = "PROJ PTS.",
      QB = "QB",
      RB = "RB",
      WR = "WR",
      TE = "TE",
      WRTE = "WRTE",
      validPositions = [QB, RB, WR, TE],
      draftPositions = [QB, RB, WRTE],
      leagueSettings = {
        teams: 6,
        QB: 1,
        RB: 2,
        WRTE: 2
      };

(async function () {
  const playerData = [];
  let playerDataWithPARs = [];

  dailyPlayers.forEach(player => {
    const playerInfo = player.PLAYER.split(' '),
          position = playerInfo[playerInfo.length -1];

    if (validPositions.includes(position)) {
      playerData.push({
        name: playerInfo.slice(0, -3).join(" "),
        position: (position === TE || position === WR) ? WRTE : position,
        points: player[projPoints]
      })
    }
  })

  draftPositions.forEach(position => {
    let playerCountForPosition = leagueSettings[position] * leagueSettings.teams,
        tempArray = playerData.sort((playerA, playerB) =>  {
          return playerB.points - playerA.points;
        }).filter(player => player.position === position).slice(0, 
          playerCountForPosition);

    for (let i = tempArray.length - 1; i > -1; i--) {
      const player = tempArray[i],
            previousPlayer = tempArray[i + 1];
      player.PARtotal = previousPlayer ?
        Math.round(((player.points - previousPlayer.points) * (tempArray.length - i - 1) + previousPlayer.PARtotal) * 100) / 100 :
        0;
    }

    playerDataWithPARs = playerDataWithPARs.concat(tempArray);
  })

  playerDataWithPARs.sort((playerA, playerB) => playerB.PARtotal - playerA.PARtotal).forEach((player, index) => {
    console.log(index + 1, player)
  })
})()
