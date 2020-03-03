'use strict'

const fs = require('fs'),
      dailyPlayers = JSON.parse(fs.readFileSync('NBA/data/dailyBasketballPlayers.json')),
      extraDataSources = [
        {
          sourceName: 'aws',
          getName: player => player.Name,
          pointsStr: "Fpts"
        },
        {
          sourceName: 'phan',
          getName: player => player.PlayerName,
          pointsStr: "FantasyPointsFanDuel"
        },
        {
          sourceName: 'rg',
          getName: player => player.name,
          pointsStr: "points"
        },
        {
          sourceName: 'fnerd',
          getName: player => player["Player Name"],
          pointsStr: "Proj"
        },
        {
          sourceName: 'dff',
          getName: player => player.first_name + " " + player.last_name,
          pointsStr: "ppg_projection"
        }
        // {
        //   sourceName: 'rw',
        //   getName: player => player.NAME,
        //   pointsStr: "proj"
        // },
      ],
      G = "G",
      F = "F",
      C = "C",
      PG = "PG",
      SG = "SG",
      SF = "SF",
      PF = "PF",
      guards = [PG, SG],
      forwards = [SF, PF],
      allPositions = [PG, SG, SF, PF, C],
      draftPositions = [G, F, C],
      timesToExclude = [],
      leagueSettings = {
        teams: 3,
        G: 2,
        F: 2,
        C: 1
      },
      GTD = "GTD",
      OUT = "OUT",
      injuryStatuses = [GTD, OUT],
      switchToGuard = [
        "Will Barton",
        "Luke Kennard",
        "Jaylen Brown",
        "Alec Burks"
      ],
      switchToCenter = [
        "Al Horford",
        "Bam Adebayo",
        "Jarrett Allen",
        "Frank Kaminsky",
        "LaMarcus Aldridge"
      ],
      switchToForward = [
        "Derrick Favors",
        "Montrezl Harrell",
        "Jimmy Butler",
        "Andrew Wiggins",
        "Khris Middleton",
        "RJ Barrett",
        "Bobby Portis"
      ];

(async function () {
  const playerData = [],
        findPlayer = newSourcePlayer => {
          const newSourcePlayerName = newSourcePlayer.name;
          return playerData.find(originalDataPlayer => {
            const originalDataPlayerName = originalDataPlayer.name;
            return newSourcePlayerName.includes(originalDataPlayerName) ||
              originalDataPlayerName.includes(newSourcePlayerName);
          });
        },
        addPlayer = (player, pointsStr) => {
          const foundPlayer = findPlayer(player);
          return foundPlayer ? foundPlayer.pointsArr.push(player[pointsStr]) : null;
        },
        getDataFromSource = name => JSON.parse(fs.readFileSync(`NBA/data/${name}BasketballPlayers.json`));

  let playerDataWithPARs = [];

  dailyPlayers.forEach(player => {
    const playerInfo = player.Player.split(' '),
          nfPosition = allPositions.includes(playerInfo[2]) ? playerInfo[2] : playerInfo[3],
          position = (guards.includes(nfPosition) ? G :
            (forwards.includes(nfPosition) ? F : C)),
          points = player.FP;

    let name = playerInfo.slice(0, 2).join(" ");

    name = name === "Louis Williams" ? "Lou Williams" : name;
    name = name === "C.J. McCollum" ? "CJ McCollum" : name;

    if (!timesToExclude.includes(Number(playerInfo[playerInfo.length - 1].split("")[0]))) {
      playerData.push({
        name,
        position: switchToCenter.includes(name) ? C : (
          switchToForward.includes(name) ? F : (switchToGuard.includes(name) ? G : position)),
        injuryStatus: injuryStatuses.includes(playerInfo[playerInfo.length - 3]),
        pointsArr: [points]
      })
    }
  })

  extraDataSources.forEach(dataSource => {
    let { sourceName, getName, pointsStr } = dataSource;
    getDataFromSource(sourceName).forEach(player => {
      player.name = getName(player);
      if ((sourceName === "rg" || sourceName === "fnerd" || sourceName === "rw") && player.name === "C.J. McCollum") player.name = "CJ McCollum";
      if (sourceName === "rw") {
        const { PTS, REB, AST, STL, BLK, TO } = player;
        player.proj = PTS + (REB * 1.2) + (AST * 1.5) + ((STL + BLK) * 3) - TO;
      }
      addPlayer(player, pointsStr)
    });
  })

  playerData.forEach(player => {
    let { pointsArr, name } = player,
        midpoint = pointsArr.length / 2,
        midpointMinusOne = midpoint - 1;
    
    //Median
    // pointsArr.sort((pointTotalA, pointTotalB) => pointTotalB - pointTotalA);
    // player.points = (pointsArr[midpoint] + pointsArr[midpointMinusOne]) / 2;
    // if (!player.points) player.points = 0;

    // Average
    player.points = pointsArr.sort((pointTotalA, pointTotalB) => pointTotalB - pointTotalA).reduce((accum, points) => {
      return accum + points
    }, 0) / pointsArr.length;

    if (pointsArr[0] - pointsArr[pointsArr.length - 1] >= 15) console.log(
      'Point Discrepency', name, pointsArr
    );
  })

  draftPositions.forEach(position => {
    let playerCountForPosition = leagueSettings[position] * leagueSettings.teams,
        tempArray = playerData.filter(player => player.position === position).sort((playerA, playerB) => {
          return playerB.points - playerA.points;
        }).slice(0, playerCountForPosition);

    for (let i = tempArray.length - 1; i > -1; i--) {
      const player = tempArray[i],
            previousPlayer = tempArray[i + 1];
      player.PARtotal = previousPlayer ?
        Math.round(((player.points - previousPlayer.points) * (tempArray.length - i - 1) + previousPlayer.PARtotal) * 100) / 100 :
        0;
    }

    playerDataWithPARs = playerDataWithPARs.concat(tempArray);
  })

  playerDataWithPARs.sort((playerA, playerB) => {
    return playerB.PARtotal - playerA.PARtotal
  }).forEach((player, index) => {
    console.log(index + 1, player)
  })

  console.log("PAR per team:",
    playerDataWithPARs.reduce((accum, playerData) => accum + playerData.PARtotal, 0) / leagueSettings.teams)
})()
