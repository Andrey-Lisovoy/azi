const express = require('express')
const http = require('http')
const path = require('path')
const socketIO = require('socket.io')

const app = express()
const server = http.Server(app)
const io = socketIO(server)

app.set('port', 8000)
app.use('/static', express.static(__dirname + "/static"))

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/static', 'index.html'))
})

server.listen(8000, function() {
    console.log('Started')
})

let PLAYERS = [];
let GAME = initGAME();

io.on('connection', function(socket) {

    // ---------- ENTER TO TABLE ------------
    if(PLAYERS.length >= 6 || GAME.started) return;
    PLAYERS.push({
        id: PLAYERS.length,
        socketId: socket.id,
        name: 'player_'+(PLAYERS.length+1),
        money: 10000,
        ready: false
    })
    io.sockets.emit('allPlayers', PLAYERS)
    // ---------------------------------------

    // ---------- LEAVE TABLE ----------------
    socket.on('disconnect', function() {
        PLAYERS = PLAYERS.filter(function(player) { return player.socketId !== socket.id })
        io.sockets.emit('allPlayers', PLAYERS)
    })
    // ---------------------------------------

    // ------------- READY -------------------
    socket.on('ready', () => {
        let currentPlayer = PLAYERS.find(player => player.socketId === socket.id);
        currentPlayer.ready = true

        let readyPlayers = PLAYERS.filter(function(player) {
            return player.ready == true;
        });

        if(readyPlayers.length == PLAYERS.length && PLAYERS.length > 1) {
            GAME.players = JSON.parse(JSON.stringify(PLAYERS))
            io.sockets.emit('event', {
                name: 'firstBet',
                player: GAME.players[0]
            })
            GAME.started = true
            console.log('ИГРА НАЧАЛАСЬ')
        }
    })
    // ---------------------------------------

    // ------------ FIRST BET ----------------
    socket.on('firstBet', (answer) => {
        console.log('ПРИШЛА ПЕРВАЯ СТАВКА')
        let currentPlayer = GAME.players.find(player => player.socketId === socket.id);
        currentPlayer.playerGaming = answer;
        if(answer) {
            if(GAME.currentBet) {
                GAME.currentBet = GAME.currentBet * 2
            } else {
                GAME.currentBet = 100
            }
            GAME.addBetToBank(GAME.currentBet);
            io.sockets.emit('event', {
                name: 'playerBet',
                player: currentPlayer,
                bet: GAME.currentBet
            })
        }
        let findNextPlayer = false;
        
        for(let player of GAME.players) {
            if(!player.hasOwnProperty('playerGaming')) {
                findNextPlayer = true;
                io.sockets.emit('event', {
                    name: 'firstBet',
                    player: player
                })
            }
        }
        if(!findNextPlayer) {
            console.log('ВСЕ ИГРОКИ ПРИНЯЛИ РЕШЕНИЕ О ИГРЕ')

            GAME.setPlayerCard()

            gamingPlayers = GAME.players.filter(player => player.playerGaming == true);

            io.sockets.emit('event', {
                name: 'secondBet',
                player: gamingPlayers[0]
            })
        }
    })
    // ---------------------------------------

    // ----------- SECOND BET ----------------
    socket.on('secondBet', (answer) => {
        console.log('ПРИШЛА ВТОРАЯ СТАВКА')
        let currentPlayer = GAME.players.find(player => player.socketId === socket.id);
        switch(answer) {
            case 'pas': {
                currentPlayer.playerGaming = false;
                break;
            }
            case 'increase': {
                GAME.currentBet = GAME.currentBet * 2
                GAME.addBetToBank(GAME.currentBet);
                io.sockets.emit('event', {
                    name: 'playerBet',
                    player: currentPlayer,
                    bet: GAME.currentBet
                })
                break;
            }
            case 'equal': {
                GAME.currentBet = GAME.currentBet
                GAME.addBetToBank(GAME.currentBet);
                io.sockets.emit('event', {
                    name: 'playerBet',
                    player: currentPlayer,
                    bet: GAME.currentBet
                })
                currentPlayer.equalSecondBet = true;
                break;
            }
        }
        gamingPlayers = GAME.players.filter(player => player.playerGaming == true);
        let findNextPlayer = false;
        for(let player of gamingPlayers) {
            if(!player.equalSecondBet && player.socketId != socket.id) {
                findNextPlayer = true;
                io.sockets.emit('event', {
                    name: 'secondBet',
                    player: player
                })
            }
        }
        if(!findNextPlayer) {
            console.log('ВСЕ ИГРОКИ ПРИНЯЛИ РЕШЕНИЕ О ВТОРОЙ СТАВКЕ')

            gamingPlayers = GAME.players.filter(player => player.playerGaming == true);

            io.sockets.emit('event', {
                name: 'discardCard',
                player: gamingPlayers[0]
            })
        }

    })
    // ---------------------------------------

    // ---------- DISCARD CART ---------------
    socket.on('discardCard', (cardId) => {
        console.log('ВЫЛОЖИЛИ КАРТУ')
        let currentPlayer = GAME.players.find(player => player.socketId === socket.id);
        let cards = getCards();
        console.log('cardId', cardId);
        let currentCard = cards.find(card => card.img == cardId);
        console.log('currentCard', currentCard);
        io.sockets.emit('event', {
            name: 'playerCard',
            player: currentPlayer,
            card: currentCard
        })
        currentPlayer.discardedCard = cardId

        gamingPlayers = GAME.players.filter(player => player.playerGaming == true);
        discardingPlayers = GAME.players.filter(player => player.hasOwnProperty('discardedCard') && player.discardedCard.length);

        console.log('gamingPlayers', gamingPlayers.length);
        console.log('discardingPlayers', discardingPlayers.length);

        if(gamingPlayers.length != discardingPlayers.length) {
            for(player of gamingPlayers) {
                if(!player.hasOwnProperty('discardedCard') || !player.discardedCard) {
                    io.sockets.emit('event', {
                        name: 'discardCard',
                        player: player
                    })  
                }
            } 
        } else {
            console.log('ВСЕ ИГРОКИ ВЫЛОЖИЛИ КАРТЫ')
            let discardedCards = [];
            let cards = getCards();
            discardingPlayers = GAME.players.filter(player => player.hasOwnProperty('discardedCard') && player.discardedCard.length);
            for(player of discardingPlayers) {
                discardedCards.push(cards.find(card => card.img == player.discardedCard));
            }
            console.log('discardedCards', discardedCards);
            let winCardId = getWinCard(discardedCards);
            console.log('winCardId', winCardId);
            let winPlayer = discardingPlayers.find(player => player.discardedCard == winCardId);
            if(winPlayer.hasOwnProperty('winRound')) {
                winPlayer.winRound = winPlayer.winRound + 1;
            } else {
                winPlayer.winRound = 1;
            }

            let winRoundCount = 0;
            for(player of discardingPlayers) {
                if(player.winRound == 2) {
                    io.sockets.emit('event', {
                        name: 'winPlayer',
                        player: player
                    })
                    GAME = initGAME()
                    io.sockets.emit('event', {
                        name: 'bank',
                        bank: GAME.bank
                    });
                    for(player of PLAYERS) {
                        player.ready = false;
                    }
                    return
                } else if(player.winRound == 1) {
                    winRoundCount++;
                }
            }

            if(winRoundCount == 3) {
                io.sockets.emit('azi', {
                    name: 'azi'
                })
                GAME = initGAME()
                io.sockets.emit('event', {
                    name: 'bank',
                    bank: GAME.bank
                });
                for(player of PLAYERS) {
                    player.ready = false;
                }
            } else {
                for(player of discardingPlayers) {
                    player.discardedCard = ''
                }
                io.sockets.emit('event', {
                    name: 'discardCard',
                    player: player,
                    clean: true
                })  
            }
        }

    })
    // ---------------------------------------

})

function initGAME() {
    return {
        started: false,
        players: [],
        bank: 0,
        addBetToBank: function (bet) {
            this.bank = this.bank + bet;
            io.sockets.emit('event', {
                name: 'bank',
                bank: this.bank
            });
        },
        setPlayerCard: function() {
            let cards = getCards()
            shuffle(cards);
            for(player of GAME.players) {
                player.cards = cards.splice(0, 3)
                io.sockets.emit('event', {
                    name: 'giveCards',
                    player: player,
                    cards: player.cards
                });
            }
            GAME.deskCard = cards.splice(0,1)[0];
            io.sockets.emit('event', {
                name: 'deskSuit',
                deskCard: GAME.deskCard
            })
        }
    }
}

function getCards() {
    return [
        {
            number: 6,
            suit: 'k',
            img: '6_k'
        },
        {
            number: 7,
            suit: 'k',
            img: '7_k'
        },
        {
            number: 8,
            suit: 'k',
            img: '8_k'
        },
        {
            number: 9,
            suit: 'k',
            img: '9_k'
        },
        {
            number: 10,
            suit: 'k',
            img: '10_k'
        },
        {
            number: 11,
            suit: 'k',
            img: 'J_k'
        },
        {
            number: 12,
            suit: 'k',
            img: 'Q_k'
        },
        {
            number: 13,
            suit: 'k',
            img: 'K_k'
        },
        {
            number: 14,
            suit: 'k',
            img: 'A_k'
        },
        {
            number: 6,
            suit: 'l',
            img: '6_l'
        },
        {
            number: 7,
            suit: 'l',
            img: '7_l'
        },
        {
            number: 8,
            suit: 'l',
            img: '8_l'
        },
        {
            number: 9,
            suit: 'l',
            img: '9_l'
        },
        {
            number: 10,
            suit: 'l',
            img: '10_l'
        },
        {
            number: 11,
            suit: 'l',
            img: 'J_l'
        },
        {
            number: 12,
            suit: 'l',
            img: 'Q_l'
        },
        {
            number: 13,
            suit: 'l',
            img: 'K_l'
        },
        {
            number: 14,
            suit: 'l',
            img: 'A_l'
        },
        {
            number: 6,
            suit: 'p',
            img: '6_p'
        },
        {
            number: 7,
            suit: 'p',
            img: '7_p'
        },
        {
            number: 8,
            suit: 'p',
            img: '8_p'
        },
        {
            number: 9,
            suit: 'p',
            img: '9_p'
        },
        {
            number: 10,
            suit: 'p',
            img: '10_p'
        },
        {
            number: 11,
            suit: 'p',
            img: 'J_p'
        },
        {
            number: 12,
            suit: 'p',
            img: 'Q_p'
        },
        {
            number: 13,
            suit: 'p',
            img: 'K_p'
        },
        {
            number: 14,
            suit: 'p',
            img: 'A_p'
        },
    ]
}

function shuffle(array) {
    array.sort(() => Math.random() - 0.5);
}

function getWinCard(cards) {
    let deskCardSuit = GAME.deskCard.suit;

    let priorityCards = [];
    for(card of cards) {
        if(card.suit == deskCardSuit) priorityCards.push(card);
    }

    if(priorityCards.length == 1) {
        return priorityCards[0].img;
    }
    else if (priorityCards.length > 1) {
        let priorityNumbers = [];
        for(card of priorityCards) {
            priorityNumbers.push(card.number)
        }
        priorityNumbers.sort();
        let winNumber = priorityNumbers[0];
        return priorityCards.find(card => card.number == winNumber).img;
    }
    else {
        let numbers = [];
        for(card of cards) {
            numbers.push(card.number)
        }
        numbers.sort();
        let winNumber = numbers[0];
        return cards.find(card => card.number == winNumber).img;
    }

}

