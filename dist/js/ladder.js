"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
class Player {
    constructor() {
        return Vue.reactive(this);
    }
}
class Ranker {
    accountId = 0;
    username = '';
    points = 0;
    power = 1;
    bias = 0;
    multiplier = 1;
    you = false;
    growing = true;
    timesAsshole = 0;
    grapes = 0;
    vinegar = 0;
    rank = 0;
    autoPromote = false;
    rankHistory = [];
    static from(source) {
        let ranker = source.you ? new YouRanker() : new Ranker();
        ranker.username = unescapeHtml(source.username);
        ranker.you = source.you;
        ranker.accountId = source.accountId;
        ranker.bias = source.bias;
        ranker.growing = source.growing;
        ranker.multiplier = source.multiplier;
        ranker.rank = source.rank;
        ranker.timesAsshole = source.timesAsshole;
        ranker.points = +source.points;
        ranker.power = +source.power;
        if (source.you) {
            let youSource = source;
            let youRanker = ranker;
            youRanker.autoPromote = youSource.autoPromote;
            youRanker.grapes = +youSource.grapes;
            youRanker.vinegar = +youSource.vinegar;
        }
        return ranker;
    }
    get powerFormatted() {
        return `${numberFormatter.format(this.power)} [+${(this.bias + '').padStart(2, '0')} x${(this.multiplier + '').padStart(2, '0')}]`;
    }
    get pointsFormatted() {
        return numberFormatter.format(this.points);
    }
}
class YouRanker extends Ranker {
    you = true;
}
class FairLadder {
    socket;
    userData = new UserData();
    state = VueReactive({
        connected: false,
        connectionRequested: false,
        rankersById: {},
        ladderNum: 1,
        vinegared: {
            justVinegared: false,
            vinegaredBy: new Ranker(),
            vinegarThrown: 0,
        },
        currentLadder: {
            number: 0,
        },
        yourRanker: new YouRanker(),
        firstRanker: new Ranker(),
        rankers: [new Ranker()],
        startRank: 0,
        infoData: {
            pointsForPromote: 250000000,
            minimumPeopleForPromote: 10,
            assholeLadder: 15,
            assholeTags: ["", "♠", "♣", "♥", "♦"],
            baseVinegarNeededToThrow: 1000000,
            baseGrapesNeededToAutoPromote: 2000,
            manualPromoteWaitTime: 15,
            autoPromoteLadder: 2
        },
        pointsNeededForManualPromote: 0,
        currentTime: 0,
    });
    ladderSubscription;
    connect() {
        if (!this.socket)
            throw 0;
        if (!this.userData.uuid)
            throw 0;
        if (this.state.connected || this.state.connectionRequested)
            return false;
        this.state.connectionRequested = true;
        this.ladderSubscription = this.socket.subscribe('/topic/ladder/$ladderNum', (data) => {
            this.handleLadderUpdates(data);
        }, { uuid: this.userData.uuid }, this.state.ladderNum);
        this.socket.subscribe('/user/queue/ladder/', (data) => {
            this.handleLadderInit(data);
        }, { uuid: this.userData.uuid });
        this.socket.subscribe('/user/queue/ladder/updates', (data) => {
            this.handlePrivateLadderUpdates(data);
        }, { uuid: this.userData.uuid });
        this.socket.send('/app/ladder/init/$ladderNum', { uuid: this.userData.uuid }, this.state.ladderNum);
        this.socket.subscribe('/user/queue/info', (data) => {
            this.handleInfo(data);
        }, { uuid: this.userData.uuid });
        this.socket.send('/app/info', { uuid: this.userData.uuid });
    }
    disconnect() {
        // todo
    }
    handleLadderUpdates(message) {
        for (let event of message.events) {
            this.handleEvent(event);
        }
        this.calculateLadder(message.secondsPassed);
    }
    handleEvent(event) {
        console.log(event);
        switch (event.eventType) {
            case 'BIAS': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.bias++;
                ranker.points = 0;
                break;
            }
            case 'MULTI': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.multiplier++;
                ranker.bias = 0;
                ranker.points = 0;
                ranker.power = 0;
                break;
            }
            case 'VINEGAR': {
                let vinegarThrown = +event.data.amount;
                let ranker = this.state.rankersById[event.accountId];
                ranker.vinegar = 0;
                let target = this.state.firstRanker;
                if (target.you) {
                    if (event.data.success) {
                        this.state.vinegared = {
                            justVinegared: true,
                            vinegaredBy: ranker,
                            vinegarThrown,
                        };
                        // alert(ranker.username + " threw their "
                        // + numberFormatter.format(vinegarThrown)
                        // + " Vinegar at you and made you slip to the bottom of the ladder.");
                    }
                }
                target.vinegar = Math.max(0, target.vinegar - vinegarThrown);
                break;
            }
            case 'SOFT_RESET_POINTS': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.points = 0;
                break;
            }
            case 'PROMOTE': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.growing = false;
                if (event.accountId == this.userData.accountId) {
                    // let newLadderNum = ladderData.currentLadder.number + 1
                    // changeLadder(newLadderNum);
                    // changeChatRoom(newLadderNum);
                }
                break;
            }
            case 'AUTO_PROMOTE': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.grapes -= this.getAutoPromoteGrapeCost(ranker.rank);
                ranker.autoPromote = true;
                break;
            }
            case 'JOIN': {
                let ranker = new Ranker();
                ranker.accountId = event.accountId;
                ranker.username = unescapeHtml(event.data.username);
                ranker.rank = this.state.rankers.length + 1;
                if (!this.state.rankers.find(e => e.accountId == event.accountId)) {
                    this.state.rankers.push(ranker);
                    this.state.rankersById[ranker.accountId] = ranker;
                }
                break;
            }
            case 'NAME_CHANGE': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.username = unescapeHtml(event.data);
                break;
            }
            case 'RESET': {
                // disconnect is made automatically
                location.reload();
                break;
            }
        }
    }
    handleInfo(message) {
        this.state.infoData = {
            assholeLadder: message.assholeLadder,
            assholeTags: message.assholeTags,
            autoPromoteLadder: message.autoPromoteLadder,
            baseGrapesNeededToAutoPromote: +message.baseGrapesNeededToAutoPromote,
            baseVinegarNeededToThrow: +message.baseVinegarNeededToThrow,
            manualPromoteWaitTime: message.manualPromoteWaitTime,
            minimumPeopleForPromote: message.minimumPeopleForPromote,
            pointsForPromote: +message.pointsForPromote,
        };
    }
    handlePrivateLadderUpdates(message) {
        for (let event of message.events) {
            this.handleEvent(event);
        }
    }
    handleLadderInit(message) {
        if (message.status === "OK") {
            if (message.content) {
                localStorage._ladder = JSON.stringify(message);
                console.log(message);
                this.state.currentLadder.number = message.content.currentLadder.number;
                this.state.startRank = message.content.startRank;
                this.state.rankers = message.content.rankers.map(e => Ranker.from(e));
                this.state.rankersById = Object.fromEntries(this.state.rankers.map(e => [e.accountId, e]));
                this.state.yourRanker = this.state.rankersById[message.content.yourRanker.accountId];
                this.state.firstRanker = this.state.rankers[0];
                this.state.connectionRequested = false;
                this.state.connected = true;
                this.userData.accountId = this.state.yourRanker.accountId;
                this.userData.username = this.state.yourRanker.username;
            }
        }
    }
    calculateLadder(secondsPassed) {
        this.state.currentTime += secondsPassed;
        // FIXME this uses 400ms per 8k rankers
        this.state.rankers.sort((a, b) => b.points - a.points);
        let ladderStats = {
            growingRankerCount: 0,
            pointsNeededForManualPromote: 0,
            eta: 0
        };
        this.state.rankers.forEach((ranker, index) => {
            let rank = index + 1;
            ranker.rank = rank;
            // If the ranker is currently still on ladder
            if (!ranker.growing)
                return;
            ladderStats.growingRankerCount += 1;
            // Calculating Points & Power
            if (rank != 1) {
                ranker.power += Math.floor((ranker.bias + rank - 1) * ranker.multiplier * secondsPassed);
            }
            ranker.points += Math.floor(ranker.power * secondsPassed);
            // Calculating Vinegar based on Grapes count
            if (rank == 1) {
                if (this.state.currentLadder.number === 1)
                    ranker.vinegar = Math.floor(ranker.vinegar * (0.9975 ** secondsPassed));
            }
            else {
                ranker.vinegar += Math.floor(ranker.grapes * secondsPassed);
            }
        });
        // let rankersOld = this.state.rankers.slice();
        // FIXME this uses 400ms per 8k rankers
        this.state.rankers.sort((a, b) => b.points - a.points);
        this.state.rankers.forEach((ranker, index, list) => {
            let rank = index + 1;
            if (rank == ranker.rank)
                return;
            ranker.rankHistory.unshift({
                currentTime: this.state.currentTime,
                oldRank: ranker.rank,
                rank,
            });
            if (ranker.rankHistory.length > 10) {
                ranker.rankHistory.pop();
            }
            if (rank < ranker.rank) {
                // rank increase, gain grapes
                for (let r = ranker.rank; r < rank; r++) {
                    // let otherRanker = rankersOld[r];
                    if (ranker.growing && (ranker.bias > 0 || ranker.multiplier > 1)) {
                        ranker.grapes++;
                    }
                }
            }
            ranker.rank = rank;
        });
        // Ranker on Last Place gains 1 Grape, only if he isn't the only one
        if (this.state.rankers.length >= Math.max(this.state.infoData.minimumPeopleForPromote, this.state.currentLadder.number)) {
            let lastRanker = this.state.rankers[this.state.rankers.length - 1];
            if (lastRanker.growing) {
                lastRanker.grapes += ~~secondsPassed;
            }
        }
        this.state.firstRanker = this.state.rankers[0];
        this.calculateStats();
    }
    calculateStats() {
        this.state.pointsNeededForManualPromote = this.calculatePointsNeededForManualPromote();
        // 	// ETA
        // 	// TODO: ETA
    }
    calculatePointsNeededForManualPromote() {
        let infoData = this.state.infoData;
        if (this.state.rankers.length < Math.max(infoData.minimumPeopleForPromote, this.state.currentLadder.number)) {
            return Infinity;
        }
        if (this.state.firstRanker.points < infoData.pointsForPromote) {
            return infoData.pointsForPromote;
        }
        let firstRanker = this.state.firstRanker;
        let secondRanker = this.state.rankers[1];
        if (this.state.currentLadder.number < infoData.autoPromoteLadder) {
            if (!firstRanker.you)
                return firstRanker.points + 1;
            return secondRanker.points + 1;
        }
        let leadingRanker = firstRanker;
        let pursuingRanker = firstRanker.you ? secondRanker : firstRanker;
        // How many more points does the ranker gain against his pursuer, every Second
        let powerDiff = (leadingRanker.growing ? pursuingRanker.power : 0) - (pursuingRanker.growing ? pursuingRanker.power : 0);
        // Calculate the needed Point difference, to have f.e. 30seconds of point generation with the difference in power
        let neededPointDiff = Math.abs(powerDiff * infoData.manualPromoteWaitTime);
        return Math.max((leadingRanker.you ? pursuingRanker : leadingRanker).points + neededPointDiff, infoData.pointsForPromote);
    }
    request(type) {
        if (!this.socket)
            throw 0;
        if (!this.canRequest(type, this.state.yourRanker.accountId)) {
            console.log(`fakeRequest: %O can't do %O!`, Vue.toRaw(this.state.yourRanker), type);
        }
        this.socket.send(`/app/ladder/post/${type}`, { uuid: this.userData.uuid });
    }
    fakeUpdate(secondsPassed = 1) {
        this.calculateLadder(secondsPassed);
    }
    fakeRequest(eventType, accountId = this.state.yourRanker.accountId) {
        if (!this.canRequest(eventType.toLowerCase().replace(/_/g, '-'), accountId)) {
            console.log(`fakeRequest: %O can't do %O!`, Vue.toRaw(this.state.rankersById[accountId]), eventType);
        }
        switch (eventType) {
            case 'BIAS':
            case 'MULTI':
            case 'SOFT_RESET_POINTS':
            case 'PROMOTE':
            case 'AUTO_PROMOTE':
                this.handleEvent({ eventType, accountId });
                break;
            case 'VINEGAR': {
                let target = this.state.rankers[0];
                let source = this.state.rankersById[accountId];
                this.handleEvent({
                    eventType, accountId, data: {
                        amount: source.vinegar + '',
                        success: source.vinegar > target.vinegar,
                    }
                });
                break;
            }
            default:
                eventType;
                console.error('not implemented', { fakeRequest: true, eventType, accountId });
                alert('not implemented');
        }
        this.calculateLadder(0);
    }
    getUpgradeCost(level) {
        return Math.round(Math.pow(this.state.currentLadder.number + 1, level));
    }
    getVinegarThrowCost() {
        return this.state.infoData.baseVinegarNeededToThrow * this.state.currentLadder.number;
    }
    getAutoPromoteGrapeCost(rank) {
        let infoData = this.state.infoData;
        let minPeople = Math.max(infoData.minimumPeopleForPromote, this.state.currentLadder.number);
        let divisor = Math.max(rank - minPeople + 1, 1);
        return Math.floor(infoData.baseGrapesNeededToAutoPromote / divisor);
    }
    getBiasCost(ranker = this.state.yourRanker) {
        return this.getUpgradeCost(ranker.bias + 1);
    }
    getMultiplierCost(ranker = this.state.yourRanker) {
        return this.getUpgradeCost(ranker.multiplier);
    }
    canRequest(type, accountId = this.state.yourRanker.accountId) {
        let ranker = this.state.rankersById[accountId];
        switch (type) {
            case 'bias': {
                return this.getBiasCost(ranker) <= ranker.points;
            }
            case 'multi': {
                return this.getMultiplierCost(ranker) <= ranker.power;
            }
            case 'vinegar': {
                return this.getVinegarThrowCost() <= ranker.vinegar;
            }
            case 'promote': {
                return !!'TODO';
            }
            case 'auto-promote': {
                return !!'TODO';
            }
            case 'asshole': {
                return !!'TODO';
            }
            default:
                return false;
        }
    }
}
let FairLadderVue = class FairLadderVue extends VueWithProps({
    ladder: FairLadder,
}) {
    get _t() {
        let record = this.tableData[0];
        let ranker = this.tableData[0];
        return `
			<LADDER>
				<a-table
						:columns="columns"
						:data-source="tableData"
						size="small"
						:rowKey="(record) => record.accountId"
						:rowClassName="(record, index)=>rowClassName(record)"
						:pagination="pagination"
						x-tableLayout="fixed"
						>
					    <template #headerCell="{ column, text }">
							<template v-if="column.key == 'username'">
								<b style="width: 1em;display:inline-flex;">
								</b>Username
							</template>
						</template>
						<template #bodyCell="{ text, record: ranker, index, column }">
							<template v-if="column.key == 'rank'">
								<span style="opacity: 0.2;">{{'0000'.slice((text+'').length)}}</span>{{text}}
							</template>
							<template v-if="column.key == 'username'">
								<a-tooltip
										placement="bottomLeft"
										>
									<b style="width: 1em;display:inline-flex;justify-content: center;"
											:style="{opacity:ranker.timesAsshole?1:0.1}">
										{${this.assholeTag(ranker) || '@'}}
									</b>{{text}}

									<template #title>
										<div v-if="ranker.timesAsshole">
											Pressed Asshole Button {{ranker.timesAsshole}} times
										</div>
										<div v-if="!ranker.growing">
											Promoted
										</div>
										id:{{ranker.accountId}}
									</template>
								</a-tooltip>
								<div style="float: right;">
									<div
											v-for="a of ${this.getVisibleEvents(ranker)}"
											style="display: inline-block; width: 1ch;"
											:style="{opacity: a.opacity, color: a.delta>0?'red':'green'}"
											>
										{{ a.delta > 0 ? '▼' : '▲' }}
									</div>
								</div>
								

							</template>
						</template>
				</a-table>
			</LADDER>
		`;
    }
    pageSize = 29; //15;
    currentPage = -1;
    get pagination() {
        if (this.currentPage == -1) {
            this.currentPage = Math.ceil(this.ladder.state.yourRanker.rank / this.pageSize);
        }
        return {
            defaultPageSize: this.pageSize,
            defaultCurrent: this.currentPage,
            // hideOnSinglePage: true,
            pageSize: this.pageSize,
            showSizeChanger: true,
            current: this.currentPage,
            onChange: (page, size) => {
                this.currentPage = page;
            },
            onShowSizeChange: (page, size) => {
                this.pageSize = size;
                setTimeout(() => {
                    this.currentPage = Math.ceil(this.ladder.state.yourRanker.rank / this.pageSize);
                    console.log({
                        rank: this.ladder.state.yourRanker.rank,
                        page: this.currentPage,
                        size
                    });
                });
            },
            pageSizeOptions: Array(30).fill(0).map((e, i) => i + 1).reverse(),
        };
    }
    columns = [
        { title: '#', dataIndex: 'rank', key: 'rank', width: 'calc(16px + 4ch)', align: 'right' },
        { title: 'Username', dataIndex: 'username', key: 'username' },
        { title: 'Power', dataIndex: 'powerFormatted', key: 'power', align: 'right', width: '30%' },
        { title: 'Points', dataIndex: 'pointsFormatted', key: 'points', align: 'right', width: '30%' },
    ];
    constructor(...a) {
        super(...a);
        this.columns[1].filters = [
            { text: 'Center yourself', value: true }
        ];
        this.columns[1].onFilter = (value, ranker) => {
            if (!value)
                return true;
            if (ranker.rank == 1)
                return true;
            return this.centeredLimits.min <= ranker.rank
                && ranker.rank <= this.centeredLimits.max;
        };
    }
    get centeredLimits() {
        let state = this.ladder.state;
        let half = ~~(this.pageSize / 2), extra = this.pageSize % 2;
        let middleRank = state.yourRanker.rank;
        middleRank = Math.min(middleRank, state.rankers.length - half);
        middleRank = Math.max(middleRank, half + 1);
        return { min: middleRank - half + 1, max: middleRank + half - 1 + extra };
    }
    get tableData() {
        return this.ladder.state.rankers;
    }
    rowClassName(record) {
        return {
            'ranker-row-you': record.you,
            'ranker-row-promoted': !record.growing,
        };
    }
    assholeTag(ranker) {
        let tags = this.ladder.state.infoData.assholeTags;
        if (ranker.timesAsshole < tags.length)
            return tags[ranker.timesAsshole];
        return tags[tags.length - 1];
    }
    getVisibleEvents(ranker) {
        const visibleDuration = 10;
        const disappearDuration = 10;
        let now = this.ladder.state.currentTime;
        return ranker.rankHistory
            .map(e => {
            let timeSince = now - e.currentTime;
            let opacity = timeSince < visibleDuration ? 1 : (1 - (timeSince - visibleDuration) / disappearDuration);
            return { delta: e.rank - e.oldRank, opacity };
        }).filter(e => e.opacity > 0)
            .flatMap(e => {
            return Array(Math.abs(e.delta)).fill(e);
        })
            .slice(-10).reverse();
    }
};
__decorate([
    VueTemplate
], FairLadderVue.prototype, "_t", null);
FairLadderVue = __decorate([
    GlobalComponent
], FairLadderVue);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFkZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xhZGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBR0EsTUFBTSxNQUFNO0lBQ1g7UUFDQyxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxNQUFNO0lBQ1gsU0FBUyxHQUFjLENBQUMsQ0FBQztJQUN6QixRQUFRLEdBQVcsRUFBRSxDQUFDO0lBQ3RCLE1BQU0sR0FBVyxDQUFDLENBQUM7SUFDbkIsS0FBSyxHQUFXLENBQUMsQ0FBQztJQUNsQixJQUFJLEdBQVcsQ0FBQyxDQUFDO0lBQ2pCLFVBQVUsR0FBVyxDQUFDLENBQUM7SUFDdkIsR0FBRyxHQUFZLEtBQUssQ0FBQztJQUNyQixPQUFPLEdBQVksSUFBSSxDQUFDO0lBQ3hCLFlBQVksR0FBVyxDQUFDLENBQUM7SUFDekIsTUFBTSxHQUFXLENBQUMsQ0FBQztJQUNuQixPQUFPLEdBQVcsQ0FBQyxDQUFDO0lBRXBCLElBQUksR0FBVyxDQUFDLENBQUM7SUFDakIsV0FBVyxHQUFZLEtBQUssQ0FBQztJQUU3QixXQUFXLEdBQTZELEVBQUUsQ0FBQztJQUkzRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQXNDO1FBQ2pELElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7UUFDekQsTUFBTSxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUN4QixNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7UUFDcEMsTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxD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Q0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQyxHQUFHLGlCQUFpQixDQUFDLENBQUM7WUFDeEcsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDL0MsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7YUFDNUIsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ1osT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDeEIsQ0FBQztDQUNELENBQUE7QUFsSkE7SUFEQyxXQUFXO3VDQTREWDtBQS9ESSxhQUFhO0lBRGxCLGVBQWU7R0FDVixhQUFhLENBc0psQiIsInNvdXJjZXNDb250ZW50IjpbIlxyXG5cclxuXHJcbmNsYXNzIFBsYXllciB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHRyZXR1cm4gVnVlLnJlYWN0aXZlKHRoaXMpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgUmFua2VyIHtcclxuXHRhY2NvdW50SWQ6IGFjY291bnRJZCA9IDA7XHJcblx0dXNlcm5hbWU6IHN0cmluZyA9ICcnO1xyXG5cdHBvaW50czogbnVtYmVyID0gMDtcclxuXHRwb3dlcjogbnVtYmVyID0gMTtcclxuXHRiaWFzOiBudW1iZXIgPSAwO1xyXG5cdG11bHRpcGxpZXI6IG51bWJlciA9IDE7XHJcblx0eW91OiBib29sZWFuID0gZmFsc2U7XHJcblx0Z3Jvd2luZzogYm9vbGVhbiA9IHRydWU7XHJcblx0dGltZXNBc3Nob2xlOiBudW1iZXIgPSAwO1xyXG5cdGdyYXBlczogbnVtYmVyID0gMDtcclxuXHR2aW5lZ2FyOiBudW1iZXIgPSAwO1xyXG5cclxuXHRyYW5rOiBudW1iZXIgPSAwO1xyXG5cdGF1dG9Qcm9tb3RlOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG5cdHJhbmtIaXN0b3J5OiB7IG9sZFJhbms6IG51bWJlciwgcmFuazogbnVtYmVyLCBjdXJyZW50VGltZTogbnVtYmVyIH1bXSA9IFtdO1xyXG5cclxuXHRzdGF0aWMgZnJvbShzb3VyY2U6IFNvY2tldFlvdVJhbmtlcik6IFlvdVJhbmtlcjtcclxuXHRzdGF0aWMgZnJvbShzb3VyY2U6IFNvY2tldFJhbmtlcik6IFJhbmtlcjtcclxuXHRzdGF0aWMgZnJvbShzb3VyY2U6IFNvY2tldFJhbmtlciB8IFNvY2tldFlvdVJhbmtlcik6IFJhbmtlciB8IFlvdVJhbmtlciB7XHJcblx0XHRsZXQgcmFua2VyID0gc291cmNlLnlvdSA/IG5ldyBZb3VSYW5rZXIoKSA6IG5ldyBSYW5rZXIoKTtcclxuXHRcdHJhbmtlci51c2VybmFtZSA9IHVuZXNjYXBlSHRtbChzb3VyY2UudXNlcm5hbWUpO1xyXG5cdFx0cmFua2VyLnlvdSA9IHNvdXJjZS55b3U7XHJcblx0XHRyYW5rZXIuYWNjb3VudElkID0gc291cmNlLmFjY291bnRJZDtcclxuXHRcdHJhbmtlci5iaWFzID0gc291cmNlLmJpYXM7XHJcblx0XHRyYW5rZXIuZ3Jvd2luZyA9IHNvdXJjZS5ncm93aW5nO1xyXG5cdFx0cmFua2VyLm11bHRpcGxpZXIgPSBzb3VyY2UubXVsdGlwbGllcjtcclxuXHRcdHJhbmtlci5yYW5rID0gc291cmNlLnJhbms7XHJcblx0XHRyYW5rZXIudGltZXNBc3Nob2xlID0gc291cmNlLnRpbWVzQXNzaG9sZTtcclxuXHRcdHJhbmtlci5wb2ludHMgPSArc291cmNlLnBvaW50cztcclxuXHRcdHJhbmtlci5wb3dlciA9ICtzb3VyY2UucG93ZXI7XHJcblx0XHRpZiAoc291cmNlLnlvdSkge1xyXG5cdFx0XHRsZXQgeW91U291cmNlID0gc291cmNlIGFzIFNvY2tldFlvdVJhbmtlcjtcclxuXHRcdFx0bGV0IHlvdVJhbmtlciA9IHJhbmtlciBhcyBZb3VSYW5rZXI7XHJcblx0XHRcdHlvdVJhbmtlci5hdXRvUHJvbW90ZSA9IHlvdVNvdXJjZS5hdXRvUHJvbW90ZTtcclxuXHRcdFx0eW91UmFua2VyLmdyYXBlcyA9ICt5b3VTb3VyY2UuZ3JhcGVzO1xyXG5cdFx0XHR5b3VSYW5rZXIudmluZWdhciA9ICt5b3VTb3VyY2UudmluZWdhcjtcclxuXHRcdH1cclxuXHRcdHJldHVybiByYW5rZXI7XHJcblx0fVxyXG5cclxuXHRnZXQgcG93ZXJGb3JtYXR0ZWQoKSB7XHJcblx0XHRyZXR1cm4gYCR7bnVtYmVyRm9ybWF0dGVyLmZvcm1hdCh0aGlzLnBvd2VyKVxyXG5cdFx0XHR9IFsrJHsodGhpcy5iaWFzICsgJycpLnBhZFN0YXJ0KDIsICcwJylcclxuXHRcdFx0fSB4JHsodGhpcy5tdWx0aXBsaWVyICsgJycpLnBhZFN0YXJ0KDIsICcwJylcclxuXHRcdFx0fV1gO1xyXG5cdH1cclxuXHRnZXQgcG9pbnRzRm9ybWF0dGVkKCkge1xyXG5cdFx0cmV0dXJuIG51bWJlckZvcm1hdHRlci5mb3JtYXQodGhpcy5wb2ludHMpO1xyXG5cdH1cclxufVxyXG5jbGFzcyBZb3VSYW5rZXIgZXh0ZW5kcyBSYW5rZXIge1xyXG5cdHlvdSA9IHRydWU7XHJcbn1cclxuXHJcbmNsYXNzIEZhaXJMYWRkZXIge1xyXG5cdHNvY2tldD86IEZhaXJTb2NrZXQ7XHJcblx0dXNlckRhdGEgPSBuZXcgVXNlckRhdGEoKTtcclxuXHRzdGF0ZSA9IFZ1ZVJlYWN0aXZlKHtcclxuXHRcdGNvbm5lY3RlZDogZmFsc2UsXHJcblx0XHRjb25uZWN0aW9uUmVxdWVzdGVkOiBmYWxzZSxcclxuXHRcdHJhbmtlcnNCeUlkOiB7fSBhcyBSZWNvcmQ8YWNjb3VudElkLCBSYW5rZXI+LFxyXG5cdFx0bGFkZGVyTnVtOiAxLFxyXG5cclxuXHRcdHZpbmVnYXJlZDoge1xyXG5cdFx0XHRqdXN0VmluZWdhcmVkOiBmYWxzZSxcclxuXHRcdFx0dmluZWdhcmVkQnk6IG5ldyBSYW5rZXIoKSxcclxuXHRcdFx0dmluZWdhclRocm93bjogMCxcclxuXHRcdH0sXHJcblxyXG5cdFx0Y3VycmVudExhZGRlcjoge1xyXG5cdFx0XHRudW1iZXI6IDAsXHJcblx0XHR9LFxyXG5cdFx0eW91clJhbmtlcjogbmV3IFlvdVJhbmtlcigpLFxyXG5cdFx0Zmlyc3RSYW5rZXI6IG5ldyBSYW5rZXIoKSxcclxuXHRcdHJhbmtlcnM6IFtuZXcgUmFua2VyKCldLFxyXG5cdFx0c3RhcnRSYW5rOiAwLFxyXG5cclxuXHRcdGluZm9EYXRhOiB7XHJcblx0XHRcdHBvaW50c0ZvclByb21vdGU6IDI1MDAwMDAwMCxcclxuXHRcdFx0bWluaW11bVBlb3BsZUZvclByb21vdGU6IDEwLFxyXG5cdFx0XHRhc3Nob2xlTGFkZGVyOiAxNSxcclxuXHRcdFx0YXNzaG9sZVRhZ3M6IFtcIlwiLCBcIuKZoFwiLCBcIuKZo1wiLCBcIuKZpVwiLCBcIuKZplwiXSxcclxuXHRcdFx0YmFzZVZpbmVnYXJOZWVkZWRUb1Rocm93OiAxMDAwMDAwLFxyXG5cdFx0XHRiYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZTogMjAwMCxcclxuXHRcdFx0bWFudWFsUHJvbW90ZVdhaXRUaW1lOiAxNSxcclxuXHRcdFx0YXV0b1Byb21vdGVMYWRkZXI6IDJcclxuXHRcdH0sXHJcblxyXG5cdFx0cG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZTogMCxcclxuXHJcblx0XHRjdXJyZW50VGltZTogMCxcclxuXHR9KTtcclxuXHRsYWRkZXJTdWJzY3JpcHRpb246IGFueTtcclxuXHRjb25uZWN0KCkge1xyXG5cdFx0aWYgKCF0aGlzLnNvY2tldCkgdGhyb3cgMDtcclxuXHRcdGlmICghdGhpcy51c2VyRGF0YS51dWlkKSB0aHJvdyAwO1xyXG5cdFx0aWYgKHRoaXMuc3RhdGUuY29ubmVjdGVkIHx8IHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0dGhpcy5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gdHJ1ZTtcclxuXHJcblx0XHR0aGlzLmxhZGRlclN1YnNjcmlwdGlvbiA9IHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3RvcGljL2xhZGRlci8kbGFkZGVyTnVtJywgKGRhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVMYWRkZXJVcGRhdGVzKGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSwgdGhpcy5zdGF0ZS5sYWRkZXJOdW0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3VzZXIvcXVldWUvbGFkZGVyLycsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlTGFkZGVySW5pdChkYXRhKTtcclxuXHRcdH0sIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3VzZXIvcXVldWUvbGFkZGVyL3VwZGF0ZXMnLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZVByaXZhdGVMYWRkZXJVcGRhdGVzKGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc2VuZCgnL2FwcC9sYWRkZXIvaW5pdC8kbGFkZGVyTnVtJ1xyXG5cdFx0XHQsIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0sIHRoaXMuc3RhdGUubGFkZGVyTnVtKTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zdWJzY3JpYmUoJy91c2VyL3F1ZXVlL2luZm8nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUluZm8oZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zZW5kKCcvYXBwL2luZm8nXHJcblx0XHRcdCwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSlcclxuXHJcblx0fVxyXG5cdGRpc2Nvbm5lY3QoKSB7XHJcblx0XHQvLyB0b2RvXHJcblx0fVxyXG5cclxuXHJcblx0aGFuZGxlTGFkZGVyVXBkYXRlcyhtZXNzYWdlOiBGYWlyU29ja2V0U3Vic2NyaWJlUmVzcG9uc2VNYXBbJy90b3BpYy9sYWRkZXIvJGxhZGRlck51bSddKSB7XHJcblx0XHRmb3IgKGxldCBldmVudCBvZiBtZXNzYWdlLmV2ZW50cykge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUV2ZW50KGV2ZW50KTtcclxuXHRcdH1cclxuXHRcdHRoaXMuY2FsY3VsYXRlTGFkZGVyKG1lc3NhZ2Uuc2Vjb25kc1Bhc3NlZCk7XHJcblx0fVxyXG5cclxuXHRoYW5kbGVFdmVudChldmVudDogU29ja2V0TGFkZGVyRXZlbnQpIHtcclxuXHRcdGNvbnNvbGUubG9nKGV2ZW50KTtcclxuXHJcblx0XHRzd2l0Y2ggKGV2ZW50LmV2ZW50VHlwZSkge1xyXG5cdFx0XHRjYXNlICdCSUFTJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLmJpYXMrKztcclxuXHRcdFx0XHRyYW5rZXIucG9pbnRzID0gMDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdNVUxUSSc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci5tdWx0aXBsaWVyKys7XHJcblx0XHRcdFx0cmFua2VyLmJpYXMgPSAwO1xyXG5cdFx0XHRcdHJhbmtlci5wb2ludHMgPSAwO1xyXG5cdFx0XHRcdHJhbmtlci5wb3dlciA9IDA7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnVklORUdBUic6IHtcclxuXHRcdFx0XHRsZXQgdmluZWdhclRocm93biA9ICtldmVudC5kYXRhLmFtb3VudDtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci52aW5lZ2FyID0gMDtcclxuXHRcdFx0XHRsZXQgdGFyZ2V0ID0gdGhpcy5zdGF0ZS5maXJzdFJhbmtlcjtcclxuXHRcdFx0XHRpZiAodGFyZ2V0LnlvdSkge1xyXG5cdFx0XHRcdFx0aWYgKGV2ZW50LmRhdGEuc3VjY2Vzcykge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnN0YXRlLnZpbmVnYXJlZCA9IHtcclxuXHRcdFx0XHRcdFx0XHRqdXN0VmluZWdhcmVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdHZpbmVnYXJlZEJ5OiByYW5rZXIsXHJcblx0XHRcdFx0XHRcdFx0dmluZWdhclRocm93bixcclxuXHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0Ly8gYWxlcnQocmFua2VyLnVzZXJuYW1lICsgXCIgdGhyZXcgdGhlaXIgXCJcclxuXHRcdFx0XHRcdFx0Ly8gKyBudW1iZXJGb3JtYXR0ZXIuZm9ybWF0KHZpbmVnYXJUaHJvd24pXHJcblx0XHRcdFx0XHRcdC8vICsgXCIgVmluZWdhciBhdCB5b3UgYW5kIG1hZGUgeW91IHNsaXAgdG8gdGhlIGJvdHRvbSBvZiB0aGUgbGFkZGVyLlwiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGFyZ2V0LnZpbmVnYXIgPSBNYXRoLm1heCgwLCB0YXJnZXQudmluZWdhciAtIHZpbmVnYXJUaHJvd24pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ1NPRlRfUkVTRVRfUE9JTlRTJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLnBvaW50cyA9IDA7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnUFJPTU9URSc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci5ncm93aW5nID0gZmFsc2U7XHJcblxyXG5cdFx0XHRcdGlmIChldmVudC5hY2NvdW50SWQgPT0gdGhpcy51c2VyRGF0YS5hY2NvdW50SWQpIHtcclxuXHRcdFx0XHRcdC8vIGxldCBuZXdMYWRkZXJOdW0gPSBsYWRkZXJEYXRhLmN1cnJlbnRMYWRkZXIubnVtYmVyICsgMVxyXG5cdFx0XHRcdFx0Ly8gY2hhbmdlTGFkZGVyKG5ld0xhZGRlck51bSk7XHJcblx0XHRcdFx0XHQvLyBjaGFuZ2VDaGF0Um9vbShuZXdMYWRkZXJOdW0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdBVVRPX1BST01PVEUnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIuZ3JhcGVzIC09IHRoaXMuZ2V0QXV0b1Byb21vdGVHcmFwZUNvc3QocmFua2VyLnJhbmspO1xyXG5cdFx0XHRcdHJhbmtlci5hdXRvUHJvbW90ZSA9IHRydWU7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnSk9JTic6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gbmV3IFJhbmtlcigpO1xyXG5cdFx0XHRcdHJhbmtlci5hY2NvdW50SWQgPSBldmVudC5hY2NvdW50SWQ7XHJcblx0XHRcdFx0cmFua2VyLnVzZXJuYW1lID0gdW5lc2NhcGVIdG1sKGV2ZW50LmRhdGEudXNlcm5hbWUpO1xyXG5cdFx0XHRcdHJhbmtlci5yYW5rID0gdGhpcy5zdGF0ZS5yYW5rZXJzLmxlbmd0aCArIDE7XHJcblx0XHRcdFx0aWYgKCF0aGlzLnN0YXRlLnJhbmtlcnMuZmluZChlID0+IGUuYWNjb3VudElkID09IGV2ZW50LmFjY291bnRJZCkpIHtcclxuXHRcdFx0XHRcdHRoaXMuc3RhdGUucmFua2Vycy5wdXNoKHJhbmtlcik7XHJcblx0XHRcdFx0XHR0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW3Jhbmtlci5hY2NvdW50SWRdID0gcmFua2VyO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdOQU1FX0NIQU5HRSc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci51c2VybmFtZSA9IHVuZXNjYXBlSHRtbChldmVudC5kYXRhKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdSRVNFVCc6IHtcclxuXHRcdFx0XHQvLyBkaXNjb25uZWN0IGlzIG1hZGUgYXV0b21hdGljYWxseVxyXG5cdFx0XHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRoYW5kbGVJbmZvKG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3VzZXIvcXVldWUvaW5mbyddKSB7XHJcblx0XHR0aGlzLnN0YXRlLmluZm9EYXRhID0ge1xyXG5cdFx0XHRhc3Nob2xlTGFkZGVyOiBtZXNzYWdlLmFzc2hvbGVMYWRkZXIsXHJcblx0XHRcdGFzc2hvbGVUYWdzOiBtZXNzYWdlLmFzc2hvbGVUYWdzLFxyXG5cdFx0XHRhdXRvUHJvbW90ZUxhZGRlcjogbWVzc2FnZS5hdXRvUHJvbW90ZUxhZGRlcixcclxuXHRcdFx0YmFzZUdyYXBlc05lZWRlZFRvQXV0b1Byb21vdGU6ICttZXNzYWdlLmJhc2VHcmFwZXNOZWVkZWRUb0F1dG9Qcm9tb3RlLFxyXG5cdFx0XHRiYXNlVmluZWdhck5lZWRlZFRvVGhyb3c6ICttZXNzYWdlLmJhc2VWaW5lZ2FyTmVlZGVkVG9UaHJvdyxcclxuXHRcdFx0bWFudWFsUHJvbW90ZVdhaXRUaW1lOiBtZXNzYWdlLm1hbnVhbFByb21vdGVXYWl0VGltZSxcclxuXHRcdFx0bWluaW11bVBlb3BsZUZvclByb21vdGU6IG1lc3NhZ2UubWluaW11bVBlb3BsZUZvclByb21vdGUsXHJcblx0XHRcdHBvaW50c0ZvclByb21vdGU6ICttZXNzYWdlLnBvaW50c0ZvclByb21vdGUsXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRoYW5kbGVQcml2YXRlTGFkZGVyVXBkYXRlcyhtZXNzYWdlOiBGYWlyU29ja2V0U3Vic2NyaWJlUmVzcG9uc2VNYXBbJy91c2VyL3F1ZXVlL2xhZGRlci91cGRhdGVzJ10pIHtcclxuXHRcdGZvciAobGV0IGV2ZW50IG9mIG1lc3NhZ2UuZXZlbnRzKSB7XHJcblx0XHRcdHRoaXMuaGFuZGxlRXZlbnQoZXZlbnQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aGFuZGxlTGFkZGVySW5pdChtZXNzYWdlOiBGYWlyU29ja2V0U3Vic2NyaWJlUmVzcG9uc2VNYXBbJy91c2VyL3F1ZXVlL2xhZGRlci8nXSkge1xyXG5cdFx0aWYgKG1lc3NhZ2Uuc3RhdHVzID09PSBcIk9LXCIpIHtcclxuXHRcdFx0aWYgKG1lc3NhZ2UuY29udGVudCkge1xyXG5cdFx0XHRcdGxvY2FsU3RvcmFnZS5fbGFkZGVyID0gSlNPTi5zdHJpbmdpZnkobWVzc2FnZSk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2cobWVzc2FnZSk7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlciA9IG1lc3NhZ2UuY29udGVudC5jdXJyZW50TGFkZGVyLm51bWJlcjtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLnN0YXJ0UmFuayA9IG1lc3NhZ2UuY29udGVudC5zdGFydFJhbms7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5yYW5rZXJzID0gbWVzc2FnZS5jb250ZW50LnJhbmtlcnMubWFwKGUgPT4gUmFua2VyLmZyb20oZSkpO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUucmFua2Vyc0J5SWQgPSBPYmplY3QuZnJvbUVudHJpZXModGhpcy5zdGF0ZS5yYW5rZXJzLm1hcChlID0+IFtlLmFjY291bnRJZCwgZV0pKTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLnlvdXJSYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW21lc3NhZ2UuY29udGVudC55b3VyUmFua2VyLmFjY291bnRJZF0gYXMgWW91UmFua2VyO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuZmlyc3RSYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNbMF07XHJcblxyXG5cdFx0XHRcdHRoaXMuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuY29ubmVjdGVkID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0dGhpcy51c2VyRGF0YS5hY2NvdW50SWQgPSB0aGlzLnN0YXRlLnlvdXJSYW5rZXIuYWNjb3VudElkO1xyXG5cdFx0XHRcdHRoaXMudXNlckRhdGEudXNlcm5hbWUgPSB0aGlzLnN0YXRlLnlvdXJSYW5rZXIudXNlcm5hbWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGNhbGN1bGF0ZUxhZGRlcihzZWNvbmRzUGFzc2VkOiBudW1iZXIpIHtcclxuXHRcdHRoaXMuc3RhdGUuY3VycmVudFRpbWUgKz0gc2Vjb25kc1Bhc3NlZDtcclxuXHRcdC8vIEZJWE1FIHRoaXMgdXNlcyA0MDBtcyBwZXIgOGsgcmFua2Vyc1xyXG5cdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLnNvcnQoKGEsIGIpID0+IGIucG9pbnRzIC0gYS5wb2ludHMpO1xyXG5cclxuXHRcdGxldCBsYWRkZXJTdGF0cyA9IHtcclxuXHRcdFx0Z3Jvd2luZ1JhbmtlckNvdW50OiAwLFxyXG5cdFx0XHRwb2ludHNOZWVkZWRGb3JNYW51YWxQcm9tb3RlOiAwLFxyXG5cdFx0XHRldGE6IDBcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnN0YXRlLnJhbmtlcnMuZm9yRWFjaCgocmFua2VyLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRsZXQgcmFuayA9IGluZGV4ICsgMTtcclxuXHRcdFx0cmFua2VyLnJhbmsgPSByYW5rO1xyXG5cdFx0XHQvLyBJZiB0aGUgcmFua2VyIGlzIGN1cnJlbnRseSBzdGlsbCBvbiBsYWRkZXJcclxuXHRcdFx0aWYgKCFyYW5rZXIuZ3Jvd2luZykgcmV0dXJuO1xyXG5cdFx0XHRsYWRkZXJTdGF0cy5ncm93aW5nUmFua2VyQ291bnQgKz0gMTtcclxuXHJcblx0XHRcdC8vIENhbGN1bGF0aW5nIFBvaW50cyAmIFBvd2VyXHJcblx0XHRcdGlmIChyYW5rICE9IDEpIHtcclxuXHRcdFx0XHRyYW5rZXIucG93ZXIgKz0gTWF0aC5mbG9vcigocmFua2VyLmJpYXMgKyByYW5rIC0gMSkgKiByYW5rZXIubXVsdGlwbGllciAqIHNlY29uZHNQYXNzZWQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJhbmtlci5wb2ludHMgKz0gTWF0aC5mbG9vcihyYW5rZXIucG93ZXIgKiBzZWNvbmRzUGFzc2VkKTtcclxuXHJcblxyXG5cdFx0XHQvLyBDYWxjdWxhdGluZyBWaW5lZ2FyIGJhc2VkIG9uIEdyYXBlcyBjb3VudFxyXG5cdFx0XHRpZiAocmFuayA9PSAxKSB7XHJcblx0XHRcdFx0aWYgKHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIgPT09IDEpXHJcblx0XHRcdFx0XHRyYW5rZXIudmluZWdhciA9IE1hdGguZmxvb3IocmFua2VyLnZpbmVnYXIgKiAoMC45OTc1ICoqIHNlY29uZHNQYXNzZWQpKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyYW5rZXIudmluZWdhciArPSBNYXRoLmZsb29yKHJhbmtlci5ncmFwZXMgKiBzZWNvbmRzUGFzc2VkKVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBsZXQgcmFua2Vyc09sZCA9IHRoaXMuc3RhdGUucmFua2Vycy5zbGljZSgpO1xyXG5cdFx0Ly8gRklYTUUgdGhpcyB1c2VzIDQwMG1zIHBlciA4ayByYW5rZXJzXHJcblx0XHR0aGlzLnN0YXRlLnJhbmtlcnMuc29ydCgoYSwgYikgPT4gYi5wb2ludHMgLSBhLnBvaW50cyk7XHJcblxyXG5cdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLmZvckVhY2goKHJhbmtlciwgaW5kZXgsIGxpc3QpID0+IHtcclxuXHRcdFx0bGV0IHJhbmsgPSBpbmRleCArIDE7XHJcblx0XHRcdGlmIChyYW5rID09IHJhbmtlci5yYW5rKSByZXR1cm47XHJcblxyXG5cdFx0XHRyYW5rZXIucmFua0hpc3RvcnkudW5zaGlmdCh7XHJcblx0XHRcdFx0Y3VycmVudFRpbWU6IHRoaXMuc3RhdGUuY3VycmVudFRpbWUsXHJcblx0XHRcdFx0b2xkUmFuazogcmFua2VyLnJhbmssXHJcblx0XHRcdFx0cmFuayxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGlmIChyYW5rZXIucmFua0hpc3RvcnkubGVuZ3RoID4gMTApIHtcclxuXHRcdFx0XHRyYW5rZXIucmFua0hpc3RvcnkucG9wKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChyYW5rIDwgcmFua2VyLnJhbmspIHtcclxuXHRcdFx0XHQvLyByYW5rIGluY3JlYXNlLCBnYWluIGdyYXBlc1xyXG5cdFx0XHRcdGZvciAobGV0IHIgPSByYW5rZXIucmFuazsgciA8IHJhbms7IHIrKykge1xyXG5cdFx0XHRcdFx0Ly8gbGV0IG90aGVyUmFua2VyID0gcmFua2Vyc09sZFtyXTtcclxuXHRcdFx0XHRcdGlmIChyYW5rZXIuZ3Jvd2luZyAmJiAocmFua2VyLmJpYXMgPiAwIHx8IHJhbmtlci5tdWx0aXBsaWVyID4gMSkpIHtcclxuXHRcdFx0XHRcdFx0cmFua2VyLmdyYXBlcysrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmFua2VyLnJhbmsgPSByYW5rO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmFua2VyIG9uIExhc3QgUGxhY2UgZ2FpbnMgMSBHcmFwZSwgb25seSBpZiBoZSBpc24ndCB0aGUgb25seSBvbmVcclxuXHRcdGlmICh0aGlzLnN0YXRlLnJhbmtlcnMubGVuZ3RoID49IE1hdGgubWF4KHRoaXMuc3RhdGUuaW5mb0RhdGEubWluaW11bVBlb3BsZUZvclByb21vdGUsIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIpKSB7XHJcblx0XHRcdGxldCBsYXN0UmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzW3RoaXMuc3RhdGUucmFua2Vycy5sZW5ndGggLSAxXTtcclxuXHRcdFx0aWYgKGxhc3RSYW5rZXIuZ3Jvd2luZykge1xyXG5cdFx0XHRcdGxhc3RSYW5rZXIuZ3JhcGVzICs9IH5+c2Vjb25kc1Bhc3NlZDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0dGhpcy5zdGF0ZS5maXJzdFJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc1swXTtcclxuXHJcblx0XHR0aGlzLmNhbGN1bGF0ZVN0YXRzKCk7XHJcblx0fVxyXG5cclxuXHRjYWxjdWxhdGVTdGF0cygpIHtcclxuXHRcdHRoaXMuc3RhdGUucG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZSA9IHRoaXMuY2FsY3VsYXRlUG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZSgpO1xyXG5cdFx0Ly8gXHQvLyBFVEFcclxuXHRcdC8vIFx0Ly8gVE9ETzogRVRBXHJcblx0fVxyXG5cdGNhbGN1bGF0ZVBvaW50c05lZWRlZEZvck1hbnVhbFByb21vdGUoKSB7XHJcblx0XHRsZXQgaW5mb0RhdGEgPSB0aGlzLnN0YXRlLmluZm9EYXRhO1xyXG5cdFx0aWYgKHRoaXMuc3RhdGUucmFua2Vycy5sZW5ndGggPCBNYXRoLm1heChpbmZvRGF0YS5taW5pbXVtUGVvcGxlRm9yUHJvbW90ZSwgdGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlcikpIHtcclxuXHRcdFx0cmV0dXJuIEluZmluaXR5O1xyXG5cdFx0fVxyXG5cdFx0aWYgKHRoaXMuc3RhdGUuZmlyc3RSYW5rZXIucG9pbnRzIDwgaW5mb0RhdGEucG9pbnRzRm9yUHJvbW90ZSkge1xyXG5cdFx0XHRyZXR1cm4gaW5mb0RhdGEucG9pbnRzRm9yUHJvbW90ZTtcclxuXHRcdH1cclxuXHRcdGxldCBmaXJzdFJhbmtlciA9IHRoaXMuc3RhdGUuZmlyc3RSYW5rZXI7XHJcblx0XHRsZXQgc2Vjb25kUmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzWzFdO1xyXG5cdFx0aWYgKHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIgPCBpbmZvRGF0YS5hdXRvUHJvbW90ZUxhZGRlcikge1xyXG5cdFx0XHRpZiAoIWZpcnN0UmFua2VyLnlvdSkgcmV0dXJuIGZpcnN0UmFua2VyLnBvaW50cyArIDE7XHJcblx0XHRcdHJldHVybiBzZWNvbmRSYW5rZXIucG9pbnRzICsgMTtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgbGVhZGluZ1JhbmtlciA9IGZpcnN0UmFua2VyO1xyXG5cdFx0bGV0IHB1cnN1aW5nUmFua2VyID0gZmlyc3RSYW5rZXIueW91ID8gc2Vjb25kUmFua2VyIDogZmlyc3RSYW5rZXI7XHJcblxyXG5cdFx0Ly8gSG93IG1hbnkgbW9yZSBwb2ludHMgZG9lcyB0aGUgcmFua2VyIGdhaW4gYWdhaW5zdCBoaXMgcHVyc3VlciwgZXZlcnkgU2Vjb25kXHJcblx0XHRsZXQgcG93ZXJEaWZmID0gKGxlYWRpbmdSYW5rZXIuZ3Jvd2luZyA/IHB1cnN1aW5nUmFua2VyLnBvd2VyIDogMCkgLSAocHVyc3VpbmdSYW5rZXIuZ3Jvd2luZyA/IHB1cnN1aW5nUmFua2VyLnBvd2VyIDogMCk7XHJcblx0XHQvLyBDYWxjdWxhdGUgdGhlIG5lZWRlZCBQb2ludCBkaWZmZXJlbmNlLCB0byBoYXZlIGYuZS4gMzBzZWNvbmRzIG9mIHBvaW50IGdlbmVyYXRpb24gd2l0aCB0aGUgZGlmZmVyZW5jZSBpbiBwb3dlclxyXG5cdFx0bGV0IG5lZWRlZFBvaW50RGlmZiA9IE1hdGguYWJzKHBvd2VyRGlmZiAqIGluZm9EYXRhLm1hbnVhbFByb21vdGVXYWl0VGltZSk7XHJcblxyXG5cdFx0cmV0dXJuIE1hdGgubWF4KFxyXG5cdFx0XHQobGVhZGluZ1Jhbmtlci55b3UgPyBwdXJzdWluZ1JhbmtlciA6IGxlYWRpbmdSYW5rZXIpLnBvaW50cyArIG5lZWRlZFBvaW50RGlmZixcclxuXHRcdFx0aW5mb0RhdGEucG9pbnRzRm9yUHJvbW90ZVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cclxuXHRyZXF1ZXN0KHR5cGU6ICdhc3Nob2xlJyB8ICdhdXRvLXByb21vdGUnIHwgJ2JpYXMnIHwgJ211bHRpJyB8ICdwcm9tb3RlJyB8ICd2aW5lZ2FyJykge1xyXG5cdFx0aWYgKCF0aGlzLnNvY2tldCkgdGhyb3cgMDtcclxuXHRcdGlmICghdGhpcy5jYW5SZXF1ZXN0KHR5cGUsIHRoaXMuc3RhdGUueW91clJhbmtlci5hY2NvdW50SWQpKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBmYWtlUmVxdWVzdDogJU8gY2FuJ3QgZG8gJU8hYCwgVnVlLnRvUmF3KHRoaXMuc3RhdGUueW91clJhbmtlciksIHR5cGUpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5zb2NrZXQuc2VuZChgL2FwcC9sYWRkZXIvcG9zdC8ke3R5cGV9YCwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSk7XHJcblx0fVxyXG5cclxuXHRmYWtlVXBkYXRlKHNlY29uZHNQYXNzZWQ6IG51bWJlciA9IDEpIHtcclxuXHRcdHRoaXMuY2FsY3VsYXRlTGFkZGVyKHNlY29uZHNQYXNzZWQpO1xyXG5cdH1cclxuXHRmYWtlUmVxdWVzdChldmVudFR5cGU6IFNvY2tldExhZGRlckV2ZW50WydldmVudFR5cGUnXSwgYWNjb3VudElkOiBhY2NvdW50SWQgPSB0aGlzLnN0YXRlLnlvdXJSYW5rZXIuYWNjb3VudElkKSB7XHJcblx0XHRpZiAoIXRoaXMuY2FuUmVxdWVzdChldmVudFR5cGUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9fL2csICctJykgYXMgYW55LCBhY2NvdW50SWQpKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBmYWtlUmVxdWVzdDogJU8gY2FuJ3QgZG8gJU8hYCwgVnVlLnRvUmF3KHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbYWNjb3VudElkXSksIGV2ZW50VHlwZSk7XHJcblx0XHR9XHJcblx0XHRzd2l0Y2ggKGV2ZW50VHlwZSkge1xyXG5cdFx0XHRjYXNlICdCSUFTJzpcclxuXHRcdFx0Y2FzZSAnTVVMVEknOlxyXG5cdFx0XHRjYXNlICdTT0ZUX1JFU0VUX1BPSU5UUyc6XHJcblx0XHRcdGNhc2UgJ1BST01PVEUnOlxyXG5cdFx0XHRjYXNlICdBVVRPX1BST01PVEUnOlxyXG5cdFx0XHRcdHRoaXMuaGFuZGxlRXZlbnQoeyBldmVudFR5cGUsIGFjY291bnRJZCB9KTsgYnJlYWs7XHJcblx0XHRcdGNhc2UgJ1ZJTkVHQVInOiB7XHJcblx0XHRcdFx0bGV0IHRhcmdldCA9IHRoaXMuc3RhdGUucmFua2Vyc1swXTtcclxuXHRcdFx0XHRsZXQgc291cmNlID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFthY2NvdW50SWRdO1xyXG5cdFx0XHRcdHRoaXMuaGFuZGxlRXZlbnQoe1xyXG5cdFx0XHRcdFx0ZXZlbnRUeXBlLCBhY2NvdW50SWQsIGRhdGE6IHtcclxuXHRcdFx0XHRcdFx0YW1vdW50OiBzb3VyY2UudmluZWdhciArICcnLFxyXG5cdFx0XHRcdFx0XHRzdWNjZXNzOiBzb3VyY2UudmluZWdhciA+IHRhcmdldC52aW5lZ2FyLFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pOyBicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdGV2ZW50VHlwZTtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdub3QgaW1wbGVtZW50ZWQnLCB7IGZha2VSZXF1ZXN0OiB0cnVlLCBldmVudFR5cGUsIGFjY291bnRJZCB9KTtcclxuXHRcdFx0XHRhbGVydCgnbm90IGltcGxlbWVudGVkJyk7XHJcblx0XHR9XHJcblx0XHR0aGlzLmNhbGN1bGF0ZUxhZGRlcigwKTtcclxuXHR9XHJcblxyXG5cclxuXHJcblx0Z2V0VXBncmFkZUNvc3QobGV2ZWw6IG51bWJlcikge1xyXG5cdFx0cmV0dXJuIE1hdGgucm91bmQoTWF0aC5wb3codGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlciArIDEsIGxldmVsKSk7XHJcblx0fVxyXG5cclxuXHRnZXRWaW5lZ2FyVGhyb3dDb3N0KCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuc3RhdGUuaW5mb0RhdGEuYmFzZVZpbmVnYXJOZWVkZWRUb1Rocm93ICogdGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlcjtcclxuXHR9XHJcblxyXG5cdGdldEF1dG9Qcm9tb3RlR3JhcGVDb3N0KHJhbms6IG51bWJlcikge1xyXG5cdFx0bGV0IGluZm9EYXRhID0gdGhpcy5zdGF0ZS5pbmZvRGF0YTtcclxuXHRcdGxldCBtaW5QZW9wbGUgPSBNYXRoLm1heChpbmZvRGF0YS5taW5pbXVtUGVvcGxlRm9yUHJvbW90ZSwgdGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlcik7XHJcblx0XHRsZXQgZGl2aXNvciA9IE1hdGgubWF4KHJhbmsgLSBtaW5QZW9wbGUgKyAxLCAxKTtcclxuXHRcdHJldHVybiBNYXRoLmZsb29yKGluZm9EYXRhLmJhc2VHcmFwZXNOZWVkZWRUb0F1dG9Qcm9tb3RlIC8gZGl2aXNvcik7XHJcblx0fVxyXG5cclxuXHRnZXRCaWFzQ29zdChyYW5rZXI6IFJhbmtlciA9IHRoaXMuc3RhdGUueW91clJhbmtlcikge1xyXG5cdFx0cmV0dXJuIHRoaXMuZ2V0VXBncmFkZUNvc3QocmFua2VyLmJpYXMgKyAxKTtcclxuXHR9XHJcblx0Z2V0TXVsdGlwbGllckNvc3QocmFua2VyOiBSYW5rZXIgPSB0aGlzLnN0YXRlLnlvdXJSYW5rZXIpIHtcclxuXHRcdHJldHVybiB0aGlzLmdldFVwZ3JhZGVDb3N0KHJhbmtlci5tdWx0aXBsaWVyKTtcclxuXHR9XHJcblxyXG5cdGNhblJlcXVlc3QodHlwZTogJ2Fzc2hvbGUnIHwgJ2F1dG8tcHJvbW90ZScgfCAnYmlhcycgfCAnbXVsdGknIHwgJ3Byb21vdGUnIHwgJ3ZpbmVnYXInLCBhY2NvdW50SWQgPSB0aGlzLnN0YXRlLnlvdXJSYW5rZXIuYWNjb3VudElkKSB7XHJcblx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFthY2NvdW50SWRdO1xyXG5cdFx0c3dpdGNoICh0eXBlKSB7XHJcblx0XHRcdGNhc2UgJ2JpYXMnOiB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0Qmlhc0Nvc3QocmFua2VyKSA8PSByYW5rZXIucG9pbnRzO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ211bHRpJzoge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmdldE11bHRpcGxpZXJDb3N0KHJhbmtlcikgPD0gcmFua2VyLnBvd2VyO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ3ZpbmVnYXInOiB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0VmluZWdhclRocm93Q29zdCgpIDw9IHJhbmtlci52aW5lZ2FyO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ3Byb21vdGUnOiB7XHJcblx0XHRcdFx0cmV0dXJuICEhJ1RPRE8nO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ2F1dG8tcHJvbW90ZSc6IHtcclxuXHRcdFx0XHRyZXR1cm4gISEnVE9ETyc7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnYXNzaG9sZSc6IHtcclxuXHRcdFx0XHRyZXR1cm4gISEnVE9ETyc7XHJcblx0XHRcdH1cclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxufVxyXG5cclxuQEdsb2JhbENvbXBvbmVudFxyXG5jbGFzcyBGYWlyTGFkZGVyVnVlIGV4dGVuZHMgVnVlV2l0aFByb3BzKHtcclxuXHRsYWRkZXI6IEZhaXJMYWRkZXIsXHJcbn0pIHtcclxuXHRAVnVlVGVtcGxhdGVcclxuXHRnZXQgX3QoKSB7XHJcblx0XHRsZXQgcmVjb3JkID0gdGhpcy50YWJsZURhdGFbMF07XHJcblx0XHRsZXQgcmFua2VyID0gdGhpcy50YWJsZURhdGFbMF07XHJcblx0XHRyZXR1cm4gYFxyXG5cdFx0XHQ8TEFEREVSPlxyXG5cdFx0XHRcdDxhLXRhYmxlXHJcblx0XHRcdFx0XHRcdDpjb2x1bW5zPVwiY29sdW1uc1wiXHJcblx0XHRcdFx0XHRcdDpkYXRhLXNvdXJjZT1cInRhYmxlRGF0YVwiXHJcblx0XHRcdFx0XHRcdHNpemU9XCJzbWFsbFwiXHJcblx0XHRcdFx0XHRcdDpyb3dLZXk9XCIocmVjb3JkKSA9PiByZWNvcmQuYWNjb3VudElkXCJcclxuXHRcdFx0XHRcdFx0OnJvd0NsYXNzTmFtZT1cIihyZWNvcmQsIGluZGV4KT0+cm93Q2xhc3NOYW1lKHJlY29yZClcIlxyXG5cdFx0XHRcdFx0XHQ6cGFnaW5hdGlvbj1cInBhZ2luYXRpb25cIlxyXG5cdFx0XHRcdFx0XHR4LXRhYmxlTGF5b3V0PVwiZml4ZWRcIlxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHQgICAgPHRlbXBsYXRlICNoZWFkZXJDZWxsPVwieyBjb2x1bW4sIHRleHQgfVwiPlxyXG5cdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSB2LWlmPVwiY29sdW1uLmtleSA9PSAndXNlcm5hbWUnXCI+XHJcblx0XHRcdFx0XHRcdFx0XHQ8YiBzdHlsZT1cIndpZHRoOiAxZW07ZGlzcGxheTppbmxpbmUtZmxleDtcIj5cclxuXHRcdFx0XHRcdFx0XHRcdDwvYj5Vc2VybmFtZVxyXG5cdFx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYm9keUNlbGw9XCJ7IHRleHQsIHJlY29yZDogcmFua2VyLCBpbmRleCwgY29sdW1uIH1cIj5cclxuXHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgdi1pZj1cImNvbHVtbi5rZXkgPT0gJ3JhbmsnXCI+XHJcblx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBzdHlsZT1cIm9wYWNpdHk6IDAuMjtcIj57eycwMDAwJy5zbGljZSgodGV4dCsnJykubGVuZ3RoKX19PC9zcGFuPnt7dGV4dH19XHJcblx0XHRcdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgdi1pZj1cImNvbHVtbi5rZXkgPT0gJ3VzZXJuYW1lJ1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGEtdG9vbHRpcFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHBsYWNlbWVudD1cImJvdHRvbUxlZnRcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdD5cclxuXHRcdFx0XHRcdFx0XHRcdFx0PGIgc3R5bGU9XCJ3aWR0aDogMWVtO2Rpc3BsYXk6aW5saW5lLWZsZXg7anVzdGlmeS1jb250ZW50OiBjZW50ZXI7XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDpzdHlsZT1cIntvcGFjaXR5OnJhbmtlci50aW1lc0Fzc2hvbGU/MTowLjF9XCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0eyR7dGhpcy5hc3Nob2xlVGFnKHJhbmtlcikgfHwgJ0AnfX1cclxuXHRcdFx0XHRcdFx0XHRcdFx0PC9iPnt7dGV4dH19XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI3RpdGxlPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDxkaXYgdi1pZj1cInJhbmtlci50aW1lc0Fzc2hvbGVcIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFByZXNzZWQgQXNzaG9sZSBCdXR0b24ge3tyYW5rZXIudGltZXNBc3Nob2xlfX0gdGltZXNcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ8ZGl2IHYtaWY9XCIhcmFua2VyLmdyb3dpbmdcIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFByb21vdGVkXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWQ6e3tyYW5rZXIuYWNjb3VudElkfX1cclxuXHRcdFx0XHRcdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHRcdDwvYS10b29sdGlwPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGRpdiBzdHlsZT1cImZsb2F0OiByaWdodDtcIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0PGRpdlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0di1mb3I9XCJhIG9mICR7dGhpcy5nZXRWaXNpYmxlRXZlbnRzKHJhbmtlcil9XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHN0eWxlPVwiZGlzcGxheTogaW5saW5lLWJsb2NrOyB3aWR0aDogMWNoO1wiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ6c3R5bGU9XCJ7b3BhY2l0eTogYS5vcGFjaXR5LCBjb2xvcjogYS5kZWx0YT4wPydyZWQnOidncmVlbid9XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdD5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR7eyBhLmRlbHRhID4gMCA/ICfilrwnIDogJ+KWsicgfX1cclxuXHRcdFx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdFx0XHRcdFxyXG5cclxuXHRcdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdDwvYS10YWJsZT5cclxuXHRcdFx0PC9MQURERVI+XHJcblx0XHRgXHJcblx0fVxyXG5cdHBhZ2VTaXplID0gMjk7Ly8xNTtcclxuXHRjdXJyZW50UGFnZSA9IC0xO1xyXG5cdGdldCBwYWdpbmF0aW9uKCk6IGFudGQuVGFibGVQcm9wczxSYW5rZXI+WydwYWdpbmF0aW9uJ10ge1xyXG5cdFx0aWYgKHRoaXMuY3VycmVudFBhZ2UgPT0gLTEpIHtcclxuXHRcdFx0dGhpcy5jdXJyZW50UGFnZSA9IE1hdGguY2VpbCh0aGlzLmxhZGRlci5zdGF0ZS55b3VyUmFua2VyLnJhbmsgLyB0aGlzLnBhZ2VTaXplKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGRlZmF1bHRQYWdlU2l6ZTogdGhpcy5wYWdlU2l6ZSxcclxuXHRcdFx0ZGVmYXVsdEN1cnJlbnQ6IHRoaXMuY3VycmVudFBhZ2UsXHJcblx0XHRcdC8vIGhpZGVPblNpbmdsZVBhZ2U6IHRydWUsXHJcblx0XHRcdHBhZ2VTaXplOiB0aGlzLnBhZ2VTaXplLFxyXG5cdFx0XHRzaG93U2l6ZUNoYW5nZXI6IHRydWUsXHJcblx0XHRcdGN1cnJlbnQ6IHRoaXMuY3VycmVudFBhZ2UsXHJcblx0XHRcdG9uQ2hhbmdlOiAocGFnZTogbnVtYmVyLCBzaXplOiBudW1iZXIpID0+IHtcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRQYWdlID0gcGFnZTtcclxuXHRcdFx0fSxcclxuXHRcdFx0b25TaG93U2l6ZUNoYW5nZTogKHBhZ2U6IG51bWJlciwgc2l6ZTogbnVtYmVyKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5wYWdlU2l6ZSA9IHNpemU7XHJcblx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmN1cnJlbnRQYWdlID0gTWF0aC5jZWlsKHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucmFuayAvIHRoaXMucGFnZVNpemUpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coe1xyXG5cdFx0XHRcdFx0XHRyYW5rOiB0aGlzLmxhZGRlci5zdGF0ZS55b3VyUmFua2VyLnJhbmssXHJcblx0XHRcdFx0XHRcdHBhZ2U6IHRoaXMuY3VycmVudFBhZ2UsXHJcblx0XHRcdFx0XHRcdHNpemVcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdHBhZ2VTaXplT3B0aW9uczogQXJyYXkoMzApLmZpbGwoMCkubWFwKChlLCBpKSA9PiBpICsgMSkucmV2ZXJzZSgpLFxyXG5cdFx0fTtcclxuXHR9XHJcblx0Y29sdW1uczogRXhjbHVkZTxhbnRkLlRhYmxlUHJvcHM8UmFua2VyPlsnY29sdW1ucyddLCB1bmRlZmluZWQ+ID0gW1xyXG5cdFx0eyB0aXRsZTogJyMnLCBkYXRhSW5kZXg6ICdyYW5rJywga2V5OiAncmFuaycsIHdpZHRoOiAnY2FsYygxNnB4ICsgNGNoKScsIGFsaWduOiAncmlnaHQnIH0sXHJcblx0XHR7IHRpdGxlOiAnVXNlcm5hbWUnLCBkYXRhSW5kZXg6ICd1c2VybmFtZScsIGtleTogJ3VzZXJuYW1lJyB9LFxyXG5cdFx0eyB0aXRsZTogJ1Bvd2VyJywgZGF0YUluZGV4OiAncG93ZXJGb3JtYXR0ZWQnLCBrZXk6ICdwb3dlcicsIGFsaWduOiAncmlnaHQnLCB3aWR0aDogJzMwJScgfSxcclxuXHRcdHsgdGl0bGU6ICdQb2ludHMnLCBkYXRhSW5kZXg6ICdwb2ludHNGb3JtYXR0ZWQnLCBrZXk6ICdwb2ludHMnLCBhbGlnbjogJ3JpZ2h0Jywgd2lkdGg6ICczMCUnIH0sXHJcblx0XTtcclxuXHRjb25zdHJ1Y3RvciguLi5hOiBhbnlbXSkge1xyXG5cdFx0c3VwZXIoLi4uYSk7XHJcblx0XHR0aGlzLmNvbHVtbnNbMV0uZmlsdGVycyA9IFtcclxuXHRcdFx0eyB0ZXh0OiAnQ2VudGVyIHlvdXJzZWxmJywgdmFsdWU6IHRydWUgfVxyXG5cdFx0XTtcclxuXHRcdHRoaXMuY29sdW1uc1sxXS5vbkZpbHRlciA9ICh2YWx1ZSwgcmFua2VyOiBSYW5rZXIpID0+IHtcclxuXHRcdFx0aWYgKCF2YWx1ZSkgcmV0dXJuIHRydWU7XHJcblx0XHRcdGlmIChyYW5rZXIucmFuayA9PSAxKSByZXR1cm4gdHJ1ZTtcclxuXHRcdFx0cmV0dXJuIHRoaXMuY2VudGVyZWRMaW1pdHMubWluIDw9IHJhbmtlci5yYW5rXHJcblx0XHRcdFx0JiYgcmFua2VyLnJhbmsgPD0gdGhpcy5jZW50ZXJlZExpbWl0cy5tYXg7XHJcblx0XHR9XHJcblx0fVxyXG5cdGdldCBjZW50ZXJlZExpbWl0cygpIHtcclxuXHRcdGxldCBzdGF0ZSA9IHRoaXMubGFkZGVyLnN0YXRlO1xyXG5cdFx0bGV0IGhhbGYgPSB+fih0aGlzLnBhZ2VTaXplIC8gMiksIGV4dHJhID0gdGhpcy5wYWdlU2l6ZSAlIDI7XHJcblx0XHRsZXQgbWlkZGxlUmFuayA9IHN0YXRlLnlvdXJSYW5rZXIucmFuaztcclxuXHRcdG1pZGRsZVJhbmsgPSBNYXRoLm1pbihtaWRkbGVSYW5rLCBzdGF0ZS5yYW5rZXJzLmxlbmd0aCAtIGhhbGYpO1xyXG5cdFx0bWlkZGxlUmFuayA9IE1hdGgubWF4KG1pZGRsZVJhbmssIGhhbGYgKyAxKTtcclxuXHRcdHJldHVybiB7IG1pbjogbWlkZGxlUmFuayAtIGhhbGYgKyAxLCBtYXg6IG1pZGRsZVJhbmsgKyBoYWxmIC0gMSArIGV4dHJhIH07XHJcblx0fVxyXG5cdGdldCB0YWJsZURhdGEoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5sYWRkZXIuc3RhdGUucmFua2VycztcclxuXHR9XHJcblx0cm93Q2xhc3NOYW1lKHJlY29yZDogUmFua2VyKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHQncmFua2VyLXJvdy15b3UnOiByZWNvcmQueW91LFxyXG5cdFx0XHQncmFua2VyLXJvdy1wcm9tb3RlZCc6ICFyZWNvcmQuZ3Jvd2luZyxcclxuXHRcdH07XHJcblx0fVxyXG5cdGFzc2hvbGVUYWcocmFua2VyOiBSYW5rZXIpIHtcclxuXHRcdGxldCB0YWdzID0gdGhpcy5sYWRkZXIuc3RhdGUuaW5mb0RhdGEuYXNzaG9sZVRhZ3M7XHJcblx0XHRpZiAocmFua2VyLnRpbWVzQXNzaG9sZSA8IHRhZ3MubGVuZ3RoKSByZXR1cm4gdGFnc1tyYW5rZXIudGltZXNBc3Nob2xlXTtcclxuXHRcdHJldHVybiB0YWdzW3RhZ3MubGVuZ3RoIC0gMV07XHJcblx0fVxyXG5cclxuXHRnZXRWaXNpYmxlRXZlbnRzKHJhbmtlcjogUmFua2VyKSB7XHJcblx0XHRjb25zdCB2aXNpYmxlRHVyYXRpb24gPSAxMDtcclxuXHRcdGNvbnN0IGRpc2FwcGVhckR1cmF0aW9uID0gMTA7XHJcblx0XHRsZXQgbm93ID0gdGhpcy5sYWRkZXIuc3RhdGUuY3VycmVudFRpbWU7XHJcblx0XHRyZXR1cm4gcmFua2VyLnJhbmtIaXN0b3J5XHJcblx0XHRcdC5tYXAoZSA9PiB7XHJcblx0XHRcdFx0bGV0IHRpbWVTaW5jZSA9IG5vdyAtIGUuY3VycmVudFRpbWU7XHJcblx0XHRcdFx0bGV0IG9wYWNpdHkgPSB0aW1lU2luY2UgPCB2aXNpYmxlRHVyYXRpb24gPyAxIDogKDEgLSAodGltZVNpbmNlIC0gdmlzaWJsZUR1cmF0aW9uKSAvIGRpc2FwcGVhckR1cmF0aW9uKTtcclxuXHRcdFx0XHRyZXR1cm4geyBkZWx0YTogZS5yYW5rIC0gZS5vbGRSYW5rLCBvcGFjaXR5IH07XHJcblx0XHRcdH0pLmZpbHRlcihlID0+IGUub3BhY2l0eSA+IDApXHJcblx0XHRcdC5mbGF0TWFwKGUgPT4ge1xyXG5cdFx0XHRcdHJldHVybiBBcnJheShNYXRoLmFicyhlLmRlbHRhKSkuZmlsbChlKTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LnNsaWNlKC0xMCkucmV2ZXJzZSgpO1xyXG5cdH1cclxufSJdfQ==