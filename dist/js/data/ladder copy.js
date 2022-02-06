

let ladderStats = {
    growingRankerCount: 0,
    pointsNeededForManualPromote: new Decimal(0),
    eta: 0
}

function buyBias() {
    if (ladderData.yourRanker.points.cmp(ladderData.firstRanker.points.mul(0.8)) >= 0) {
        if (!confirm("You're really close to the top, are you sure, you want to bias.")) {
            biasButton.prop("disabled", true);
            biasTooltip.tooltip('hide');
            return;
        }
    }
}

function buyMulti() {
    if (ladderData.yourRanker.points.cmp(ladderData.firstRanker.points.mul(0.8)) >= 0) {
        if (!confirm("You're really close to the top, are you sure, you want to multi.")) {
            multiButton.prop("disabled", true);
            multiTooltip.tooltip('hide');
            return;
        }
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

    showButtons();
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
