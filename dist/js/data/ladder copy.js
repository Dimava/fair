

let ladderStats = {
    growingRankerCount: 0,
    pointsNeededForManualPromote: new Decimal(0),
    eta: 0
}

function buyBias() {
    let cost = new Decimal(getUpgradeCost(ladderData.yourRanker.bias + 1));
    let biasButton = $('#biasButton');
    let biasTooltip = $('#biasTooltip');

    if (ladderData.yourRanker.points.cmp(ladderData.firstRanker.points.mul(0.8)) >= 0) {
        if (!confirm("You're really close to the top, are you sure, you want to bias.")) {
            biasButton.prop("disabled", true);
            biasTooltip.tooltip('hide');
            return;
        }
    }

    biasButton.prop("disabled", true);
    biasTooltip.tooltip('hide');
    if (ladderData.yourRanker.points.compare(cost) > 0) {
        stompClient.send("/app/ladder/post/bias", {}, JSON.stringify({
            'uuid': identityData.uuid
        }));
    }
}

function buyMulti() {
    let cost = getUpgradeCost(ladderData.yourRanker.multiplier + 1);
    let multiButton = $('#multiButton');
    let multiTooltip = $('#multiTooltip');

    if (ladderData.yourRanker.points.cmp(ladderData.firstRanker.points.mul(0.8)) >= 0) {
        if (!confirm("You're really close to the top, are you sure, you want to multi.")) {
            multiButton.prop("disabled", true);
            multiTooltip.tooltip('hide');
            return;
        }
    }

    multiButton.prop("disabled", true);
    multiTooltip.tooltip('hide');
    if (ladderData.yourRanker.power.compare(cost) > 0) {
        stompClient.send("/app/ladder/post/multi", {}, JSON.stringify({
            'uuid': identityData.uuid
        }));
    }
}

function throwVinegar() {
    if (ladderData.yourRanker.vinegar.cmp(getVinegarThrowCost()) >= 0) {
        stompClient.send("/app/ladder/post/vinegar", {}, JSON.stringify({
            'uuid': identityData.uuid
        }));
    }
}

function promote() {
    $('#promoteButton').hide();
    stompClient.send("/app/ladder/post/promote", {}, JSON.stringify({
        'uuid': identityData.uuid
    }));
}

function beAsshole() {
    if (ladderData.firstRanker.you && ladderData.rankers.length >= Math.max(infoData.minimumPeopleForPromote, ladderData.currentLadder.number)
        && ladderData.firstRanker.points.cmp(infoData.pointsForPromote) >= 0
        && ladderData.currentLadder.number >= infoData.assholeLadder) {
        if (confirm("Do you really wanna be an Asshole?!")) {
            stompClient.send("/app/ladder/post/asshole", {}, JSON.stringify({
                'uuid': identityData.uuid
            }));
        }
    }
}

function buyAutoPromote() {
    $('#biasButton').prop("disabled", true);
    $('#autoPromoteTooltip').tooltip('hide');
    if (ladderData.currentLadder.number >= infoData.autoPromoteLadder
        && ladderData.currentLadder.number !== infoData.assholeLadder
        && ladderData.yourRanker.grapes.cmp(getAutoPromoteGrapeCost(ladderData.yourRanker.rank)) >= 0) {
        stompClient.send("/app/ladder/post/auto-promote", {}, JSON.stringify({
            'uuid': identityData.uuid
        }));

    }
}


function changeLadder(ladderNum) {
    if (ladderSubscription) ladderSubscription.unsubscribe();
    ladderSubscription = stompClient.subscribe('/topic/ladder/' + ladderNum,
        (message) => handleLadderUpdates(JSON.parse(message.body)), {uuid: getCookie("_uuid")});
    initLadder(ladderNum);
}



function updateLadder() {
    let size = ladderData.rankers.length;
    let rank = ladderData.yourRanker.rank;
    let ladderArea = Math.floor(rank / clientData.ladderAreaSize);
    let ladderAreaIndex = ladderArea * clientData.ladderAreaSize + 1;

    let startRank = ladderAreaIndex - clientData.ladderPadding;
    let endRank = ladderAreaIndex + clientData.ladderAreaSize + clientData.ladderPadding - 1;
    // If at start of the ladder
    if (startRank < 1) {
        endRank -= startRank - 1
    }
    // If at end of the ladder
    if (endRank > size) {
        startRank -= endRank - size;
    }

    let body = document.getElementById("ladderBody");
    body.innerHTML = "";
    for (let i = 0; i < ladderData.rankers.length; i++) {
        let ranker = ladderData.rankers[i];
        if (ranker.rank === startRank) writeNewRow(body, ladderData.firstRanker);
        if ((ranker.rank > startRank && ranker.rank <= endRank)) writeNewRow(body, ranker);
    }

    // if we dont have enough Ranker yet, fill the table with filler rows
    for (let i = body.rows.length; i < clientData.ladderAreaSize + clientData.ladderPadding * 2; i++) {
        writeNewRow(body, rankerTemplate);
        body.rows[i].style.visibility = 'hidden';
    }

    let tag1 = '', tag2 = '';
    if (ladderData.yourRanker.vinegar.cmp(getVinegarThrowCost()) >= 0) {
        tag1 = '<p style="color: plum">'
        tag2 = '</p>'
    }

    $('#infoText').html('Sour Grapes: ' + numberFormatter.format(ladderData.yourRanker.grapes) + '<br>' + tag1 + 'Vinegar: ' + numberFormatter.format(ladderData.yourRanker.vinegar) + tag2);

    $('#usernameLink').html(ladderData.yourRanker.username);

    $('#rankerCount').html("Rankers: " + ladderStats.growingRankerCount + "/" + ladderData.rankers.length);
    $('#ladderNumber').html("Ladder # " + ladderData.currentLadder.number);

    $('#manualPromoteText').html("Points needed for "
        + ((ladderData.currentLadder.number === infoData.assholeLadder) ? "being an asshole" : "manually promoting")
        + ": " + numberFormatter.format(ladderStats.pointsNeededForManualPromote));

    let offCanvasBody = $('#offCanvasBody');
    offCanvasBody.empty();
    for (let i = 1; i <= ladderData.currentLadder.number; i++) {
        let ladder = $(document.createElement('li')).prop({
            class: "nav-link"
        });

        let ladderLinK = $(document.createElement('a')).prop({
            href: '#',
            innerHTML: 'Chad #' + i,
            class: "nav-link h5"
        });

        ladderLinK.click(async function () {
            changeChatRoom(i);
        })

        ladder.append(ladderLinK);
        offCanvasBody.prepend(ladder);
    }

    showButtons();
}

function writeNewRow(body, ranker) {
    let row = body.insertRow();
    if (!ranker.growing) row.classList.add('strikeout')
    let assholeTag = (ranker.timesAsshole < infoData.assholeTags.length) ?
        infoData.assholeTags[ranker.timesAsshole] : infoData.assholeTags[infoData.assholeTags.length - 1];
    let rank = (ranker.rank === 1 && !ranker.you && ranker.growing && ladderData.rankers.length >= Math.max(infoData.minimumPeopleForPromote, ladderData.currentLadder.number)
        && ladderData.firstRanker.points.cmp(infoData.pointsForPromote) >= 0 && ladderData.yourRanker.vinegar.cmp(getVinegarThrowCost()) >= 0) ?
        '<a href="#" style="text-decoration: none" onclick="throwVinegar()">🍇</a>' : ranker.rank;
    row.insertCell(0).innerHTML = rank + " " + assholeTag;
    row.insertCell(1).innerHTML = ranker.username;
    row.cells[1].style.overflow = "hidden";
    row.insertCell(2).innerHTML = numberFormatter.format(ranker.power) +
        ' [+' + ('' + ranker.bias).padStart(2, '0') + ' x' + ('' + ranker.multiplier).padStart(2, '0') + ']';
    row.cells[2].classList.add('text-end');
    row.insertCell(3).innerHTML = numberFormatter.format(ranker.points);
    row.cells[3].classList.add('text-end');
    if (ranker.you) row.classList.add('table-active');
    return row;
}

function showButtons() {
    // Bias and Multi Button Logic
    let biasButton = $('#biasButton');
    let multiButton = $('#multiButton');

    let biasCost = getUpgradeCost(ladderData.yourRanker.bias + 1);
    if (ladderData.yourRanker.points.cmp(biasCost) >= 0) {
        biasButton.prop("disabled", false);
    } else {
        biasButton.prop("disabled", true);
    }

    let multiCost = getUpgradeCost(ladderData.yourRanker.multiplier + 1);
    if (ladderData.yourRanker.power.cmp(new Decimal(multiCost)) >= 0) {
        multiButton.prop("disabled", false);
    } else {
        multiButton.prop("disabled", true);
    }
    $('#biasTooltip').attr('data-bs-original-title', numberFormatter.format(biasCost) + ' Points');
    $('#multiTooltip').attr('data-bs-original-title', numberFormatter.format(multiCost) + ' Power');

    // Promote and Asshole Button Logic
    let promoteButton = $('#promoteButton');
    let assholeButton = $('#assholeButton');
    let ladderNumber = $('#ladderNumber');

    if (ladderData.firstRanker.you && ladderData.firstRanker.points.cmp(ladderStats.pointsNeededForManualPromote) >= 0) {
        if (ladderData.currentLadder.number === infoData.assholeLadder) {
            promoteButton.hide()
            ladderNumber.hide()
            assholeButton.show()
        } else {
            assholeButton.hide()
            ladderNumber.hide()
            promoteButton.show()
        }
    } else {
        assholeButton.hide()
        promoteButton.hide()
        ladderNumber.show()
    }

    // Auto-Promote Button
    let autoPromoteButton = $('#autoPromoteButton');
    let autoPromoteTooltip = $('#autoPromoteTooltip');
    let autoPromoteCost = getAutoPromoteGrapeCost(ladderData.yourRanker.rank);
    if (!ladderData.yourRanker.autoPromote && ladderData.currentLadder.number >= infoData.autoPromoteLadder
        && ladderData.currentLadder.number !== infoData.assholeLadder) {
        autoPromoteButton.show();
        if (ladderData.yourRanker.grapes.cmp(autoPromoteCost) >= 0) {
            autoPromoteButton.prop("disabled", false);
        } else {
            autoPromoteButton.prop("disabled", true);
        }
        autoPromoteTooltip.attr('data-bs-original-title', numberFormatter.format(autoPromoteCost) + ' Grapes');
    } else {
        autoPromoteButton.hide();
    }


}
