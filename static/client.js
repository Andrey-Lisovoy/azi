const socket = io()

var playerContainers = document.querySelectorAll('.player-container')
var ICanClickReady = true;
var ICanClickIncrease = false;
var ICanClickPas = false;
var ICanClickEqual = false
var ICanClickCard = false;
var event = ''

function getPlayerContainerBySocketId(socketId) {
    for(let container of playerContainers) {
        if(container.dataset.socketId == socketId) {
            return container;
        }
    }
    return false;
}

function updateInfoText(text) {
    let infoText = document.querySelector('.info-text')
    infoText.innerHTML = text;
}

// ----------- UPDATE USER ON TABLE ---------
socket.on('allPlayers', (allPlayers) => {
    // remove leave players
    for(let container of playerContainers) {
        let playerExists = false;
        for(let player of allPlayers) {
            if(player.socketId == container.dataset.socketId) {
                playerExists = true;
            }
        }
        if(!playerExists) {
            makeEmptyPlayerContainer(container)
        }
    }
    // add new players
    allPlayers.forEach(player => {
        if(player.socketId != socket.id) {
            playerContainer = getPlayerContainerBySocketId(player.socketId)
            if(!playerContainer) {
                let emptyPlayerContainer = findEmptyContainer();
                if(emptyPlayerContainer) {
                    populatePlayerContainer(emptyPlayerContainer, player);
                    let playerName = emptyPlayerContainer.querySelector('.nickname-player');
                    playerName.innerHTML = player.name;
                }
            }
        } else {
            let myName = document.querySelector('.my-name');
            myName.innerHTML = 'Ваше имя: '+player.name;
        }
    });

    function populatePlayerContainer(playerContainer, data) {
        let playerNickname = playerContainer.querySelector('.nickname-player');
        playerNickname.innerHTML = data.name;
        playerContainer.dataset.socketId = data.socketId;
    }
    
    function makeEmptyPlayerContainer(playerContainer) {
        let playerNickname = playerContainer.querySelector('.nickname-player');
        playerNickname.innerHTML = '';
        playerContainer.dataset.socketId = null;
    }
    
    function findEmptyContainer() {
        for(let container of playerContainers) {
            if(container.dataset.socketId == 'null') {
                return container;
            }
        }
        return false;
    }
})
// ------------------------------------------



// ------------- READY ----------------------
let readyBtn = document.querySelector('#ready');
readyBtn.addEventListener('click', () => {
    if(ICanClickReady){
        ICanClickReady = false
        readyBtn.style="background-color: green";
        socket.emit('ready');
    }
});
// -------------------------------------------

// -------- INCREASE -------------------------
let increaseBtn = document.querySelector('#increase')
increaseBtn.addEventListener('click', () => {
    if(ICanClickIncrease) {
        switch(event) {
            case 'firstBet': {
                socket.emit('firstBet', true);
                break
            };
            case 'secondBet': {
                socket.emit('secondBet', 'increase');
                break
            };
        }
        ICanClickIncrease = false
        ICanClickPas = false
        ICanClickEqual = false
    }
})
// -------------------------------------------

// ------------ PAS --------------------------
let pasBtn = document.querySelector('#pas')
pasBtn.addEventListener('click', () => {
    if(ICanClickPas) {
        switch(event) {
            case 'firstBet': {
                socket.emit('firstBet', false);
                break;
            };
            case 'secondBet': {
                socket.emit('secondBet', 'pas');
                break
            };
        }
        ICanClickPas = false
        ICanClickEqual = false
        ICanClickIncrease = false
    }
})
// -------------------------------------------

// ------------ EQUAL --------------------------
let equalBtn = document.querySelector('#equal')
equalBtn.addEventListener('click', () => {
    if(ICanClickEqual) {
        switch(event) {
            case 'firstBet': {
                socket.emit('firstBet', false);
                break;
            };
            case 'secondBet': {
                socket.emit('secondBet', 'equal');
                break;
            };
        }
        ICanClickPas = false
        ICanClickEqual = false
        ICanClickIncrease = false
    }
})
// -------------------------------------------

// ------------ CARDS ------------------------
let cardBtns = document.querySelectorAll('.my-card')
cardBtns.forEach(cardBtn => cardBtn.addEventListener('click', (event) => {
    if(ICanClickCard) {
        socket.emit('discardCard', event.target.parentNode.dataset.id);
        event.target.style='display: none';
        let myCard = document.querySelector('.my-card-player .card');
        myCard.src = event.target.src;
        myCard.style = 'display: block';
        ICanClickCard = false;
    }
}))
// -------------------------------------------

socket.on('event', (data) => {
    switch(data.name) {
        case 'firstBet': {
            firstBet(socket.id, data);
            break;
        }
        case 'bank': {
            bank(data.bank);
            break;
        }
        case 'playerBet': {
            playerBet(data);
            break;
        }
        case 'giveCards': {
            giveCards(data);
            break;
        }
        case 'deskSuit': {
            deskSuit(data);
            break;
        }
        case 'secondBet': {
            secondBet(socket.id, data);
            break
        }
        case 'discardCard': {
            discardCard(socket.id, data);
            break
        }
        case 'playerCard': {
            playerCard(data);
            break
        }
        case 'winPlayer': {
            winPlayer(socket.id, data);
            break
        }
        case 'azi': {
            azi(data);
            break
        }
    }
})

function firstBet(currentSocketId, data) {
    let readyBtn = document.querySelector('#ready');
    let pasBtn = document.querySelector('#pas');
    let increaseBtn = document.querySelector('#increase');
    let equalBtn = document.querySelector('#equal');
    readyBtn.style="display: none";
    pasBtn.style="display: flex";
    increaseBtn.style="display: flex";
    equalBtn.style="display: flex";

    let myCards = document.querySelector('.my-cards');
    myCards.style="display: flex";

    if(currentSocketId != data.player.socketId) {
        $text = `Игра началась. Игроки делают первоначальную ставку. Очередь игрока ${data.player.name}.`;
    } else {
        ICanClickIncrease = true;
        ICanClickPas = true;
        event = 'firstBet'
        $text = `Игра началась. Ваша очередь делать первоначальную ставку. Нажмите ПОВЫСИТЬ(играть дальше) или ПАС(не участвовать)`;
    }

    updateInfoText($text)
}

function bank(data) {
    let bankCount = document.querySelector('.bank-game .count-money');
    bankCount.innerHTML = data;
}

function playerBet(data) {
    let player = getPlayerContainerBySocketId(data.player.socketId);
    if(player) {
        let bet = player.querySelector('.bet-player');
        bet.style = "display: flex";
        let count = bet.querySelector('.count-money')
        count.innerHTML = data.bet;

        setTimeout(function(bet) {
            bet.style = 'display: none';
        }, 5000, bet)
    }
}

function giveCards(data) {
    if(data.player.socketId == socket.id) {
        let myCards = document.querySelectorAll('.my-card');
        myCards[0].dataset.id = data.cards[0].img;
        myCards[0].querySelector('.card').src = `/static/img/cards/${data.cards[0].suit}/${data.cards[0].img}.png`
        myCards[1].dataset.id = data.cards[1].img;
        myCards[1].querySelector('.card').src = `/static/img/cards/${data.cards[1].suit}/${data.cards[1].img}.png`
        myCards[2].dataset.id = data.cards[2].img;
        myCards[2].querySelector('.card').src = `/static/img/cards/${data.cards[2].suit}/${data.cards[2].img}.png`
    }
}

function deskSuit(data) {
    let deskSuit = document.querySelector('.trump-card')
    deskSuit.src = `/static/img/cards/${data.deskCard.suit}/${data.deskCard.img}.png`
}

function secondBet(currentSocketId, data) {

    if(currentSocketId != data.player.socketId) {
        $text = `Игроки делают вторую ставку. Очередь игрока ${data.player.name}.`;
    } else {
        ICanClickIncrease = true;
        ICanClickPas = true;
        ICanClickEqual = true;
        event = 'secondBet'
        $text = `Ваша очередь делать вторую ставку. Нажмите ПОВЫСИТЬ(предыдущая ставка х2), ПАС(не участвовать) или УРАВНЯТЬ(поставить предыдущую ставку)`;
    }

    updateInfoText($text)
}

function discardCard(currentSocketId, data) {

    if(data.hasOwnProperty('clean')) {
        let cardPlayers = document.querySelectorAll('.card-player')
        for(card of cardPlayers) {
            let img = card.querySelector('.card')
            img.style = 'display: none';
        }
        let myCard = document.querySelector('.my-card-player .card');
        myCard.style = 'display: none';
    }

    if(currentSocketId != data.player.socketId) {
        $text = `Розыгрыш. Выкидывают одну карту. Очередь игрока ${data.player.name}.`;
    } else {
        ICanClickCard = true;
        event = 'chooseCard'
        $text = `Ваша очередь выкидывать карту. Выберите желаемую карту`;
    }

    updateInfoText($text)
}

function playerCard(data) {
    let player = getPlayerContainerBySocketId(data.player.socketId);
    if(player) {
        let cardPlayer = player.querySelector('.card-player')
        let img = cardPlayer.querySelector('.card')
        img.style = 'display: block';
        img.src = `/static/img/cards/${data.card.suit}/${data.card.img}.png`
    }
}

function winPlayer(currentSocketId, data) {
    let cardPlayers = document.querySelectorAll('.card-player')
    for(card of cardPlayers) {
        let img = card.querySelector('.card')
        img.style = 'display: none';
    }
    let myCard = document.querySelector('.my-card-player .card');
    myCard.style = 'display: none';

    $text = `Выиграл игрок ${data.player.name}. Нажмите готово для следующей партии`
    ICanClickReady = true;
    let readyBtn = document.querySelector('#ready');
    let pasBtn = document.querySelector('#pas');
    let increaseBtn = document.querySelector('#increase');
    let equalBtn = document.querySelector('#equal');
    readyBtn.style="display: flex";
    pasBtn.style="display: none";
    increaseBtn.style="display: none";
    equalBtn.style="display: none";

    let myCards = document.querySelector('.my-cards');
    myCards.style="display: none";
    readyBtn.style="";

    let myCardsAll = document.querySelectorAll('.my-card');
    myCardsAll[0].dataset.id = '';
    myCardsAll[0].querySelector('.card').src = `/static/img/cards/рубашка.png`
    myCardsAll[1].dataset.id = '';
    myCardsAll[1].querySelector('.card').src = `/static/img/cards/рубашка.png`
    myCardsAll[2].dataset.id = '';
    myCardsAll[2].querySelector('.card').src = `/static/img/cards/рубашка.png`

    let deskSuit = document.querySelector('.trump-card')
    deskSuit.src = `/static/img/cards/рубашка.png`

    updateInfoText($text)

}

function azi(data) {
    let cardPlayers = document.querySelectorAll('.card-player')
    for(card of cardPlayers) {
        let img = card.querySelector('.card')
        img.style = 'display: none';
    }
    let myCard = document.querySelector('.my-card-player .card');
    myCard.style = 'display: none';

    $text = `Ази. Нажмите готово для следующей партии`
    ICanClickReady = true;
    let readyBtn = document.querySelector('#ready');
    let pasBtn = document.querySelector('#pas');
    let increaseBtn = document.querySelector('#increase');
    let equalBtn = document.querySelector('#equal');
    readyBtn.style="display: flex";
    pasBtn.style="display: none";
    increaseBtn.style="display: none";
    equalBtn.style="display: none";

    let myCards = document.querySelector('.my-cards');
    myCards.style="display: none";
    readyBtn.style="";

    let myCardsAll = document.querySelectorAll('.my-card');
    myCardsAll[0].dataset.id = '';
    myCardsAll[0].querySelector('.card').src = `/static/img/cards/рубашка.png`
    myCardsAll[1].dataset.id = '';
    myCardsAll[1].querySelector('.card').src = `/static/img/cards/рубашка.png`
    myCardsAll[2].dataset.id = '';
    myCardsAll[2].querySelector('.card').src = `/static/img/cards/рубашка.png`

    let deskSuit = document.querySelector('.trump-card')
    deskSuit.src = `/static/img/cards/рубашка.png`

    updateInfoText($text)
}