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
                ranker.power += Math.floor((ranker.bias + rank - 1) * secondsPassed);
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
            console.log(`fakeRequest: %O can't do %O!`, this.state.yourRanker, type);
        }
        this.socket.send(`/app/ladder/post/${type}`, { uuid: this.userData.uuid });
    }
    fakeUpdate(secondsPassed = 1) {
        this.calculateLadder(secondsPassed);
    }
    fakeRequest(eventType, accountId) {
        if (!this.canRequest(eventType.toLowerCase().replace(/_/g, '-'), accountId)) {
            console.log(`fakeRequest: %O can't do %O!`, this.state.rankersById[accountId], eventType);
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
    getBiasCost(ranker) {
        return this.getUpgradeCost(ranker.bias + 1);
    }
    getMultiplierCost(ranker) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFkZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xhZGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBR0EsTUFBTSxNQUFNO0lBQ1g7UUFDQyxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxNQUFNO0lBQ1gsU0FBUyxHQUFjLENBQUMsQ0FBQztJQUN6QixRQUFRLEdBQVcsRUFBRSxDQUFDO0lBQ3RCLE1BQU0sR0FBVyxDQUFDLENBQUM7SUFDbkIsS0FBSyxHQUFXLENBQUMsQ0FBQztJQUNsQixJQUFJLEdBQVcsQ0FBQyxDQUFDO0lBQ2pCLFVBQVUsR0FBVyxDQUFDLENBQUM7SUFDdkIsR0FBRyxHQUFZLEtBQUssQ0FBQztJQUNyQixPQUFPLEdBQVksSUFBSSxDQUFDO0lBQ3hCLFlBQVksR0FBVyxDQUFDLENBQUM7SUFDekIsTUFBTSxHQUFXLENBQUMsQ0FBQztJQUNuQixPQUFPLEdBQVcsQ0FBQyxDQUFDO0lBRXBCLElBQUksR0FBVyxDQUFDLENBQUM7SUFDakIsV0FBVyxHQUFZLEtBQUssQ0FBQztJQUU3QixXQUFXLEdBQTZELEVBQUUsQ0FBQztJQUkzRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQXNDO1FBQ2pELElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7UUFDekQsTUFBTSxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUN4QixNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7UUFDcEMsTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxD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QyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQzthQUM1QixPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDWixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUM7YUFDRCxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN4QixDQUFDO0NBQ0QsQ0FBQTtBQWxKQTtJQURDLFdBQVc7dUNBNERYO0FBL0RJLGFBQWE7SUFEbEIsZUFBZTtHQUNWLGFBQWEsQ0FzSmxCIiwic291cmNlc0NvbnRlbnQiOlsiXHJcblxyXG5cclxuY2xhc3MgUGxheWVyIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHJldHVybiBWdWUucmVhY3RpdmUodGhpcyk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBSYW5rZXIge1xyXG5cdGFjY291bnRJZDogYWNjb3VudElkID0gMDtcclxuXHR1c2VybmFtZTogc3RyaW5nID0gJyc7XHJcblx0cG9pbnRzOiBudW1iZXIgPSAwO1xyXG5cdHBvd2VyOiBudW1iZXIgPSAxO1xyXG5cdGJpYXM6IG51bWJlciA9IDA7XHJcblx0bXVsdGlwbGllcjogbnVtYmVyID0gMTtcclxuXHR5b3U6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRncm93aW5nOiBib29sZWFuID0gdHJ1ZTtcclxuXHR0aW1lc0Fzc2hvbGU6IG51bWJlciA9IDA7XHJcblx0Z3JhcGVzOiBudW1iZXIgPSAwO1xyXG5cdHZpbmVnYXI6IG51bWJlciA9IDA7XHJcblxyXG5cdHJhbms6IG51bWJlciA9IDA7XHJcblx0YXV0b1Byb21vdGU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0cmFua0hpc3Rvcnk6IHsgb2xkUmFuazogbnVtYmVyLCByYW5rOiBudW1iZXIsIGN1cnJlbnRUaW1lOiBudW1iZXIgfVtdID0gW107XHJcblxyXG5cdHN0YXRpYyBmcm9tKHNvdXJjZTogU29ja2V0WW91UmFua2VyKTogWW91UmFua2VyO1xyXG5cdHN0YXRpYyBmcm9tKHNvdXJjZTogU29ja2V0UmFua2VyKTogUmFua2VyO1xyXG5cdHN0YXRpYyBmcm9tKHNvdXJjZTogU29ja2V0UmFua2VyIHwgU29ja2V0WW91UmFua2VyKTogUmFua2VyIHwgWW91UmFua2VyIHtcclxuXHRcdGxldCByYW5rZXIgPSBzb3VyY2UueW91ID8gbmV3IFlvdVJhbmtlcigpIDogbmV3IFJhbmtlcigpO1xyXG5cdFx0cmFua2VyLnVzZXJuYW1lID0gdW5lc2NhcGVIdG1sKHNvdXJjZS51c2VybmFtZSk7XHJcblx0XHRyYW5rZXIueW91ID0gc291cmNlLnlvdTtcclxuXHRcdHJhbmtlci5hY2NvdW50SWQgPSBzb3VyY2UuYWNjb3VudElkO1xyXG5cdFx0cmFua2VyLmJpYXMgPSBzb3VyY2UuYmlhcztcclxuXHRcdHJhbmtlci5ncm93aW5nID0gc291cmNlLmdyb3dpbmc7XHJcblx0XHRyYW5rZXIubXVsdGlwbGllciA9IHNvdXJjZS5tdWx0aXBsaWVyO1xyXG5cdFx0cmFua2VyLnJhbmsgPSBzb3VyY2UucmFuaztcclxuXHRcdHJhbmtlci50aW1lc0Fzc2hvbGUgPSBzb3VyY2UudGltZXNBc3Nob2xlO1xyXG5cdFx0cmFua2VyLnBvaW50cyA9ICtzb3VyY2UucG9pbnRzO1xyXG5cdFx0cmFua2VyLnBvd2VyID0gK3NvdXJjZS5wb3dlcjtcclxuXHRcdGlmIChzb3VyY2UueW91KSB7XHJcblx0XHRcdGxldCB5b3VTb3VyY2UgPSBzb3VyY2UgYXMgU29ja2V0WW91UmFua2VyO1xyXG5cdFx0XHRsZXQgeW91UmFua2VyID0gcmFua2VyIGFzIFlvdVJhbmtlcjtcclxuXHRcdFx0eW91UmFua2VyLmF1dG9Qcm9tb3RlID0geW91U291cmNlLmF1dG9Qcm9tb3RlO1xyXG5cdFx0XHR5b3VSYW5rZXIuZ3JhcGVzID0gK3lvdVNvdXJjZS5ncmFwZXM7XHJcblx0XHRcdHlvdVJhbmtlci52aW5lZ2FyID0gK3lvdVNvdXJjZS52aW5lZ2FyO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHJhbmtlcjtcclxuXHR9XHJcblxyXG5cdGdldCBwb3dlckZvcm1hdHRlZCgpIHtcclxuXHRcdHJldHVybiBgJHtudW1iZXJGb3JtYXR0ZXIuZm9ybWF0KHRoaXMucG93ZXIpXHJcblx0XHRcdH0gWyskeyh0aGlzLmJpYXMgKyAnJykucGFkU3RhcnQoMiwgJzAnKVxyXG5cdFx0XHR9IHgkeyh0aGlzLm11bHRpcGxpZXIgKyAnJykucGFkU3RhcnQoMiwgJzAnKVxyXG5cdFx0XHR9XWA7XHJcblx0fVxyXG5cdGdldCBwb2ludHNGb3JtYXR0ZWQoKSB7XHJcblx0XHRyZXR1cm4gbnVtYmVyRm9ybWF0dGVyLmZvcm1hdCh0aGlzLnBvaW50cyk7XHJcblx0fVxyXG59XHJcbmNsYXNzIFlvdVJhbmtlciBleHRlbmRzIFJhbmtlciB7XHJcblx0eW91ID0gdHJ1ZTtcclxufVxyXG5cclxuY2xhc3MgRmFpckxhZGRlciB7XHJcblx0c29ja2V0PzogRmFpclNvY2tldDtcclxuXHR1c2VyRGF0YSA9IG5ldyBVc2VyRGF0YSgpO1xyXG5cdHN0YXRlID0gVnVlUmVhY3RpdmUoe1xyXG5cdFx0Y29ubmVjdGVkOiBmYWxzZSxcclxuXHRcdGNvbm5lY3Rpb25SZXF1ZXN0ZWQ6IGZhbHNlLFxyXG5cdFx0cmFua2Vyc0J5SWQ6IHt9IGFzIFJlY29yZDxhY2NvdW50SWQsIFJhbmtlcj4sXHJcblx0XHRsYWRkZXJOdW06IDEsXHJcblxyXG5cdFx0dmluZWdhcmVkOiB7XHJcblx0XHRcdGp1c3RWaW5lZ2FyZWQ6IGZhbHNlLFxyXG5cdFx0XHR2aW5lZ2FyZWRCeTogbmV3IFJhbmtlcigpLFxyXG5cdFx0XHR2aW5lZ2FyVGhyb3duOiAwLFxyXG5cdFx0fSxcclxuXHJcblx0XHRjdXJyZW50TGFkZGVyOiB7XHJcblx0XHRcdG51bWJlcjogMCxcclxuXHRcdH0sXHJcblx0XHR5b3VyUmFua2VyOiBuZXcgWW91UmFua2VyKCksXHJcblx0XHRmaXJzdFJhbmtlcjogbmV3IFJhbmtlcigpLFxyXG5cdFx0cmFua2VyczogW25ldyBSYW5rZXIoKV0sXHJcblx0XHRzdGFydFJhbms6IDAsXHJcblxyXG5cdFx0aW5mb0RhdGE6IHtcclxuXHRcdFx0cG9pbnRzRm9yUHJvbW90ZTogMjUwMDAwMDAwLFxyXG5cdFx0XHRtaW5pbXVtUGVvcGxlRm9yUHJvbW90ZTogMTAsXHJcblx0XHRcdGFzc2hvbGVMYWRkZXI6IDE1LFxyXG5cdFx0XHRhc3Nob2xlVGFnczogW1wiXCIsIFwi4pmgXCIsIFwi4pmjXCIsIFwi4pmlXCIsIFwi4pmmXCJdLFxyXG5cdFx0XHRiYXNlVmluZWdhck5lZWRlZFRvVGhyb3c6IDEwMDAwMDAsXHJcblx0XHRcdGJhc2VHcmFwZXNOZWVkZWRUb0F1dG9Qcm9tb3RlOiAyMDAwLFxyXG5cdFx0XHRtYW51YWxQcm9tb3RlV2FpdFRpbWU6IDE1LFxyXG5cdFx0XHRhdXRvUHJvbW90ZUxhZGRlcjogMlxyXG5cdFx0fSxcclxuXHJcblx0XHRwb2ludHNOZWVkZWRGb3JNYW51YWxQcm9tb3RlOiAwLFxyXG5cclxuXHRcdGN1cnJlbnRUaW1lOiAwLFxyXG5cdH0pO1xyXG5cdGxhZGRlclN1YnNjcmlwdGlvbjogYW55O1xyXG5cdGNvbm5lY3QoKSB7XHJcblx0XHRpZiAoIXRoaXMuc29ja2V0KSB0aHJvdyAwO1xyXG5cdFx0aWYgKCF0aGlzLnVzZXJEYXRhLnV1aWQpIHRocm93IDA7XHJcblx0XHRpZiAodGhpcy5zdGF0ZS5jb25uZWN0ZWQgfHwgdGhpcy5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkKSByZXR1cm4gZmFsc2U7XHJcblx0XHR0aGlzLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQgPSB0cnVlO1xyXG5cclxuXHRcdHRoaXMubGFkZGVyU3Vic2NyaXB0aW9uID0gdGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdG9waWMvbGFkZGVyLyRsYWRkZXJOdW0nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUxhZGRlclVwZGF0ZXMoZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9LCB0aGlzLnN0YXRlLmxhZGRlck51bSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdXNlci9xdWV1ZS9sYWRkZXIvJywgKGRhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVMYWRkZXJJbml0KGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdXNlci9xdWV1ZS9sYWRkZXIvdXBkYXRlcycsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlUHJpdmF0ZUxhZGRlclVwZGF0ZXMoZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zZW5kKCcvYXBwL2xhZGRlci9pbml0LyRsYWRkZXJOdW0nXHJcblx0XHRcdCwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSwgdGhpcy5zdGF0ZS5sYWRkZXJOdW0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3VzZXIvcXVldWUvaW5mbycsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlSW5mbyhkYXRhKTtcclxuXHRcdH0sIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoJy9hcHAvaW5mbydcclxuXHRcdFx0LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KVxyXG5cclxuXHR9XHJcblx0ZGlzY29ubmVjdCgpIHtcclxuXHRcdC8vIHRvZG9cclxuXHR9XHJcblxyXG5cclxuXHRoYW5kbGVMYWRkZXJVcGRhdGVzKG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3RvcGljL2xhZGRlci8kbGFkZGVyTnVtJ10pIHtcclxuXHRcdGZvciAobGV0IGV2ZW50IG9mIG1lc3NhZ2UuZXZlbnRzKSB7XHJcblx0XHRcdHRoaXMuaGFuZGxlRXZlbnQoZXZlbnQpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5jYWxjdWxhdGVMYWRkZXIobWVzc2FnZS5zZWNvbmRzUGFzc2VkKTtcclxuXHR9XHJcblxyXG5cdGhhbmRsZUV2ZW50KGV2ZW50OiBTb2NrZXRMYWRkZXJFdmVudCkge1xyXG5cdFx0Y29uc29sZS5sb2coZXZlbnQpO1xyXG5cclxuXHRcdHN3aXRjaCAoZXZlbnQuZXZlbnRUeXBlKSB7XHJcblx0XHRcdGNhc2UgJ0JJQVMnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIuYmlhcysrO1xyXG5cdFx0XHRcdHJhbmtlci5wb2ludHMgPSAwO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ01VTFRJJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLm11bHRpcGxpZXIrKztcclxuXHRcdFx0XHRyYW5rZXIuYmlhcyA9IDA7XHJcblx0XHRcdFx0cmFua2VyLnBvaW50cyA9IDA7XHJcblx0XHRcdFx0cmFua2VyLnBvd2VyID0gMDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdWSU5FR0FSJzoge1xyXG5cdFx0XHRcdGxldCB2aW5lZ2FyVGhyb3duID0gK2V2ZW50LmRhdGEuYW1vdW50O1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLnZpbmVnYXIgPSAwO1xyXG5cdFx0XHRcdGxldCB0YXJnZXQgPSB0aGlzLnN0YXRlLmZpcnN0UmFua2VyO1xyXG5cdFx0XHRcdGlmICh0YXJnZXQueW91KSB7XHJcblx0XHRcdFx0XHRpZiAoZXZlbnQuZGF0YS5zdWNjZXNzKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc3RhdGUudmluZWdhcmVkID0ge1xyXG5cdFx0XHRcdFx0XHRcdGp1c3RWaW5lZ2FyZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0dmluZWdhcmVkQnk6IHJhbmtlcixcclxuXHRcdFx0XHRcdFx0XHR2aW5lZ2FyVGhyb3duLFxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHQvLyBhbGVydChyYW5rZXIudXNlcm5hbWUgKyBcIiB0aHJldyB0aGVpciBcIlxyXG5cdFx0XHRcdFx0XHQvLyArIG51bWJlckZvcm1hdHRlci5mb3JtYXQodmluZWdhclRocm93bilcclxuXHRcdFx0XHRcdFx0Ly8gKyBcIiBWaW5lZ2FyIGF0IHlvdSBhbmQgbWFkZSB5b3Ugc2xpcCB0byB0aGUgYm90dG9tIG9mIHRoZSBsYWRkZXIuXCIpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0YXJnZXQudmluZWdhciA9IE1hdGgubWF4KDAsIHRhcmdldC52aW5lZ2FyIC0gdmluZWdhclRocm93bik7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnU09GVF9SRVNFVF9QT0lOVFMnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIucG9pbnRzID0gMDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdQUk9NT1RFJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLmdyb3dpbmcgPSBmYWxzZTtcclxuXHJcblx0XHRcdFx0aWYgKGV2ZW50LmFjY291bnRJZCA9PSB0aGlzLnVzZXJEYXRhLmFjY291bnRJZCkge1xyXG5cdFx0XHRcdFx0Ly8gbGV0IG5ld0xhZGRlck51bSA9IGxhZGRlckRhdGEuY3VycmVudExhZGRlci5udW1iZXIgKyAxXHJcblx0XHRcdFx0XHQvLyBjaGFuZ2VMYWRkZXIobmV3TGFkZGVyTnVtKTtcclxuXHRcdFx0XHRcdC8vIGNoYW5nZUNoYXRSb29tKG5ld0xhZGRlck51bSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ0FVVE9fUFJPTU9URSc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci5ncmFwZXMgLT0gdGhpcy5nZXRBdXRvUHJvbW90ZUdyYXBlQ29zdChyYW5rZXIucmFuayk7XHJcblx0XHRcdFx0cmFua2VyLmF1dG9Qcm9tb3RlID0gdHJ1ZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdKT0lOJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSBuZXcgUmFua2VyKCk7XHJcblx0XHRcdFx0cmFua2VyLmFjY291bnRJZCA9IGV2ZW50LmFjY291bnRJZDtcclxuXHRcdFx0XHRyYW5rZXIudXNlcm5hbWUgPSB1bmVzY2FwZUh0bWwoZXZlbnQuZGF0YS51c2VybmFtZSk7XHJcblx0XHRcdFx0cmFua2VyLnJhbmsgPSB0aGlzLnN0YXRlLnJhbmtlcnMubGVuZ3RoICsgMTtcclxuXHRcdFx0XHRpZiAoIXRoaXMuc3RhdGUucmFua2Vycy5maW5kKGUgPT4gZS5hY2NvdW50SWQgPT0gZXZlbnQuYWNjb3VudElkKSkge1xyXG5cdFx0XHRcdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLnB1c2gocmFua2VyKTtcclxuXHRcdFx0XHRcdHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbcmFua2VyLmFjY291bnRJZF0gPSByYW5rZXI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ05BTUVfQ0hBTkdFJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLnVzZXJuYW1lID0gdW5lc2NhcGVIdG1sKGV2ZW50LmRhdGEpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ1JFU0VUJzoge1xyXG5cdFx0XHRcdC8vIGRpc2Nvbm5lY3QgaXMgbWFkZSBhdXRvbWF0aWNhbGx5XHJcblx0XHRcdFx0bG9jYXRpb24ucmVsb2FkKCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGhhbmRsZUluZm8obWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdXNlci9xdWV1ZS9pbmZvJ10pIHtcclxuXHRcdHRoaXMuc3RhdGUuaW5mb0RhdGEgPSB7XHJcblx0XHRcdGFzc2hvbGVMYWRkZXI6IG1lc3NhZ2UuYXNzaG9sZUxhZGRlcixcclxuXHRcdFx0YXNzaG9sZVRhZ3M6IG1lc3NhZ2UuYXNzaG9sZVRhZ3MsXHJcblx0XHRcdGF1dG9Qcm9tb3RlTGFkZGVyOiBtZXNzYWdlLmF1dG9Qcm9tb3RlTGFkZGVyLFxyXG5cdFx0XHRiYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZTogK21lc3NhZ2UuYmFzZUdyYXBlc05lZWRlZFRvQXV0b1Byb21vdGUsXHJcblx0XHRcdGJhc2VWaW5lZ2FyTmVlZGVkVG9UaHJvdzogK21lc3NhZ2UuYmFzZVZpbmVnYXJOZWVkZWRUb1Rocm93LFxyXG5cdFx0XHRtYW51YWxQcm9tb3RlV2FpdFRpbWU6IG1lc3NhZ2UubWFudWFsUHJvbW90ZVdhaXRUaW1lLFxyXG5cdFx0XHRtaW5pbXVtUGVvcGxlRm9yUHJvbW90ZTogbWVzc2FnZS5taW5pbXVtUGVvcGxlRm9yUHJvbW90ZSxcclxuXHRcdFx0cG9pbnRzRm9yUHJvbW90ZTogK21lc3NhZ2UucG9pbnRzRm9yUHJvbW90ZSxcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGhhbmRsZVByaXZhdGVMYWRkZXJVcGRhdGVzKG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3VzZXIvcXVldWUvbGFkZGVyL3VwZGF0ZXMnXSkge1xyXG5cdFx0Zm9yIChsZXQgZXZlbnQgb2YgbWVzc2FnZS5ldmVudHMpIHtcclxuXHRcdFx0dGhpcy5oYW5kbGVFdmVudChldmVudCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRoYW5kbGVMYWRkZXJJbml0KG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3VzZXIvcXVldWUvbGFkZGVyLyddKSB7XHJcblx0XHRpZiAobWVzc2FnZS5zdGF0dXMgPT09IFwiT0tcIikge1xyXG5cdFx0XHRpZiAobWVzc2FnZS5jb250ZW50KSB7XHJcblx0XHRcdFx0bG9jYWxTdG9yYWdlLl9sYWRkZXIgPSBKU09OLnN0cmluZ2lmeShtZXNzYWdlKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhtZXNzYWdlKTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyID0gbWVzc2FnZS5jb250ZW50LmN1cnJlbnRMYWRkZXIubnVtYmVyO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuc3RhcnRSYW5rID0gbWVzc2FnZS5jb250ZW50LnN0YXJ0UmFuaztcclxuXHRcdFx0XHR0aGlzLnN0YXRlLnJhbmtlcnMgPSBtZXNzYWdlLmNvbnRlbnQucmFua2Vycy5tYXAoZSA9PiBSYW5rZXIuZnJvbShlKSk7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5yYW5rZXJzQnlJZCA9IE9iamVjdC5mcm9tRW50cmllcyh0aGlzLnN0YXRlLnJhbmtlcnMubWFwKGUgPT4gW2UuYWNjb3VudElkLCBlXSkpO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUueW91clJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbbWVzc2FnZS5jb250ZW50LnlvdXJSYW5rZXIuYWNjb3VudElkXSBhcyBZb3VSYW5rZXI7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5maXJzdFJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc1swXTtcclxuXHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5jb25uZWN0ZWQgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHR0aGlzLnVzZXJEYXRhLmFjY291bnRJZCA9IHRoaXMuc3RhdGUueW91clJhbmtlci5hY2NvdW50SWQ7XHJcblx0XHRcdFx0dGhpcy51c2VyRGF0YS51c2VybmFtZSA9IHRoaXMuc3RhdGUueW91clJhbmtlci51c2VybmFtZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Y2FsY3VsYXRlTGFkZGVyKHNlY29uZHNQYXNzZWQ6IG51bWJlcikge1xyXG5cdFx0dGhpcy5zdGF0ZS5jdXJyZW50VGltZSArPSBzZWNvbmRzUGFzc2VkO1xyXG5cdFx0Ly8gRklYTUUgdGhpcyB1c2VzIDQwMG1zIHBlciA4ayByYW5rZXJzXHJcblx0XHR0aGlzLnN0YXRlLnJhbmtlcnMuc29ydCgoYSwgYikgPT4gYi5wb2ludHMgLSBhLnBvaW50cyk7XHJcblxyXG5cdFx0bGV0IGxhZGRlclN0YXRzID0ge1xyXG5cdFx0XHRncm93aW5nUmFua2VyQ291bnQ6IDAsXHJcblx0XHRcdHBvaW50c05lZWRlZEZvck1hbnVhbFByb21vdGU6IDAsXHJcblx0XHRcdGV0YTogMFxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuc3RhdGUucmFua2Vycy5mb3JFYWNoKChyYW5rZXIsIGluZGV4KSA9PiB7XHJcblx0XHRcdGxldCByYW5rID0gaW5kZXggKyAxO1xyXG5cdFx0XHRyYW5rZXIucmFuayA9IHJhbms7XHJcblx0XHRcdC8vIElmIHRoZSByYW5rZXIgaXMgY3VycmVudGx5IHN0aWxsIG9uIGxhZGRlclxyXG5cdFx0XHRpZiAoIXJhbmtlci5ncm93aW5nKSByZXR1cm47XHJcblx0XHRcdGxhZGRlclN0YXRzLmdyb3dpbmdSYW5rZXJDb3VudCArPSAxO1xyXG5cclxuXHRcdFx0Ly8gQ2FsY3VsYXRpbmcgUG9pbnRzICYgUG93ZXJcclxuXHRcdFx0aWYgKHJhbmsgIT0gMSkge1xyXG5cdFx0XHRcdHJhbmtlci5wb3dlciArPSBNYXRoLmZsb29yKChyYW5rZXIuYmlhcyArIHJhbmsgLSAxKSAqIHNlY29uZHNQYXNzZWQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJhbmtlci5wb2ludHMgKz0gTWF0aC5mbG9vcihyYW5rZXIucG93ZXIgKiBzZWNvbmRzUGFzc2VkKTtcclxuXHJcblxyXG5cdFx0XHQvLyBDYWxjdWxhdGluZyBWaW5lZ2FyIGJhc2VkIG9uIEdyYXBlcyBjb3VudFxyXG5cdFx0XHRpZiAocmFuayA9PSAxKSB7XHJcblx0XHRcdFx0aWYgKHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIgPT09IDEpXHJcblx0XHRcdFx0XHRyYW5rZXIudmluZWdhciA9IE1hdGguZmxvb3IocmFua2VyLnZpbmVnYXIgKiAoMC45OTc1ICoqIHNlY29uZHNQYXNzZWQpKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyYW5rZXIudmluZWdhciArPSBNYXRoLmZsb29yKHJhbmtlci5ncmFwZXMgKiBzZWNvbmRzUGFzc2VkKVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBsZXQgcmFua2Vyc09sZCA9IHRoaXMuc3RhdGUucmFua2Vycy5zbGljZSgpO1xyXG5cdFx0Ly8gRklYTUUgdGhpcyB1c2VzIDQwMG1zIHBlciA4ayByYW5rZXJzXHJcblx0XHR0aGlzLnN0YXRlLnJhbmtlcnMuc29ydCgoYSwgYikgPT4gYi5wb2ludHMgLSBhLnBvaW50cyk7XHJcblxyXG5cdFx0dGhpcy5zdGF0ZS5yYW5rZXJzLmZvckVhY2goKHJhbmtlciwgaW5kZXgsIGxpc3QpID0+IHtcclxuXHRcdFx0bGV0IHJhbmsgPSBpbmRleCArIDE7XHJcblx0XHRcdGlmIChyYW5rID09IHJhbmtlci5yYW5rKSByZXR1cm47XHJcblxyXG5cdFx0XHRyYW5rZXIucmFua0hpc3RvcnkudW5zaGlmdCh7XHJcblx0XHRcdFx0Y3VycmVudFRpbWU6IHRoaXMuc3RhdGUuY3VycmVudFRpbWUsXHJcblx0XHRcdFx0b2xkUmFuazogcmFua2VyLnJhbmssXHJcblx0XHRcdFx0cmFuayxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGlmIChyYW5rZXIucmFua0hpc3RvcnkubGVuZ3RoID4gMTApIHtcclxuXHRcdFx0XHRyYW5rZXIucmFua0hpc3RvcnkucG9wKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChyYW5rIDwgcmFua2VyLnJhbmspIHtcclxuXHRcdFx0XHQvLyByYW5rIGluY3JlYXNlLCBnYWluIGdyYXBlc1xyXG5cdFx0XHRcdGZvciAobGV0IHIgPSByYW5rZXIucmFuazsgciA8IHJhbms7IHIrKykge1xyXG5cdFx0XHRcdFx0Ly8gbGV0IG90aGVyUmFua2VyID0gcmFua2Vyc09sZFtyXTtcclxuXHRcdFx0XHRcdGlmIChyYW5rZXIuZ3Jvd2luZyAmJiAocmFua2VyLmJpYXMgPiAwIHx8IHJhbmtlci5tdWx0aXBsaWVyID4gMSkpIHtcclxuXHRcdFx0XHRcdFx0cmFua2VyLmdyYXBlcysrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmFua2VyLnJhbmsgPSByYW5rO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmFua2VyIG9uIExhc3QgUGxhY2UgZ2FpbnMgMSBHcmFwZSwgb25seSBpZiBoZSBpc24ndCB0aGUgb25seSBvbmVcclxuXHRcdGlmICh0aGlzLnN0YXRlLnJhbmtlcnMubGVuZ3RoID49IE1hdGgubWF4KHRoaXMuc3RhdGUuaW5mb0RhdGEubWluaW11bVBlb3BsZUZvclByb21vdGUsIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIpKSB7XHJcblx0XHRcdGxldCBsYXN0UmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzW3RoaXMuc3RhdGUucmFua2Vycy5sZW5ndGggLSAxXTtcclxuXHRcdFx0aWYgKGxhc3RSYW5rZXIuZ3Jvd2luZykge1xyXG5cdFx0XHRcdGxhc3RSYW5rZXIuZ3JhcGVzICs9IH5+c2Vjb25kc1Bhc3NlZDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0dGhpcy5zdGF0ZS5maXJzdFJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc1swXTtcclxuXHJcblx0XHR0aGlzLmNhbGN1bGF0ZVN0YXRzKCk7XHJcblx0fVxyXG5cclxuXHRjYWxjdWxhdGVTdGF0cygpIHtcclxuXHRcdHRoaXMuc3RhdGUucG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZSA9IHRoaXMuY2FsY3VsYXRlUG9pbnRzTmVlZGVkRm9yTWFudWFsUHJvbW90ZSgpO1xyXG5cdFx0Ly8gXHQvLyBFVEFcclxuXHRcdC8vIFx0Ly8gVE9ETzogRVRBXHJcblx0fVxyXG5cdGNhbGN1bGF0ZVBvaW50c05lZWRlZEZvck1hbnVhbFByb21vdGUoKSB7XHJcblx0XHRsZXQgaW5mb0RhdGEgPSB0aGlzLnN0YXRlLmluZm9EYXRhO1xyXG5cdFx0aWYgKHRoaXMuc3RhdGUucmFua2Vycy5sZW5ndGggPCBNYXRoLm1heChpbmZvRGF0YS5taW5pbXVtUGVvcGxlRm9yUHJvbW90ZSwgdGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlcikpIHtcclxuXHRcdFx0cmV0dXJuIEluZmluaXR5O1xyXG5cdFx0fVxyXG5cdFx0aWYgKHRoaXMuc3RhdGUuZmlyc3RSYW5rZXIucG9pbnRzIDwgaW5mb0RhdGEucG9pbnRzRm9yUHJvbW90ZSkge1xyXG5cdFx0XHRyZXR1cm4gaW5mb0RhdGEucG9pbnRzRm9yUHJvbW90ZTtcclxuXHRcdH1cclxuXHRcdGxldCBmaXJzdFJhbmtlciA9IHRoaXMuc3RhdGUuZmlyc3RSYW5rZXI7XHJcblx0XHRsZXQgc2Vjb25kUmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzWzFdO1xyXG5cdFx0aWYgKHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIgPCBpbmZvRGF0YS5hdXRvUHJvbW90ZUxhZGRlcikge1xyXG5cdFx0XHRpZiAoIWZpcnN0UmFua2VyLnlvdSkgcmV0dXJuIGZpcnN0UmFua2VyLnBvaW50cyArIDE7XHJcblx0XHRcdHJldHVybiBzZWNvbmRSYW5rZXIucG9pbnRzICsgMTtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgbGVhZGluZ1JhbmtlciA9IGZpcnN0UmFua2VyO1xyXG5cdFx0bGV0IHB1cnN1aW5nUmFua2VyID0gZmlyc3RSYW5rZXIueW91ID8gc2Vjb25kUmFua2VyIDogZmlyc3RSYW5rZXI7XHJcblxyXG5cdFx0Ly8gSG93IG1hbnkgbW9yZSBwb2ludHMgZG9lcyB0aGUgcmFua2VyIGdhaW4gYWdhaW5zdCBoaXMgcHVyc3VlciwgZXZlcnkgU2Vjb25kXHJcblx0XHRsZXQgcG93ZXJEaWZmID0gKGxlYWRpbmdSYW5rZXIuZ3Jvd2luZyA/IHB1cnN1aW5nUmFua2VyLnBvd2VyIDogMCkgLSAocHVyc3VpbmdSYW5rZXIuZ3Jvd2luZyA/IHB1cnN1aW5nUmFua2VyLnBvd2VyIDogMCk7XHJcblx0XHQvLyBDYWxjdWxhdGUgdGhlIG5lZWRlZCBQb2ludCBkaWZmZXJlbmNlLCB0byBoYXZlIGYuZS4gMzBzZWNvbmRzIG9mIHBvaW50IGdlbmVyYXRpb24gd2l0aCB0aGUgZGlmZmVyZW5jZSBpbiBwb3dlclxyXG5cdFx0bGV0IG5lZWRlZFBvaW50RGlmZiA9IE1hdGguYWJzKHBvd2VyRGlmZiAqIGluZm9EYXRhLm1hbnVhbFByb21vdGVXYWl0VGltZSk7XHJcblxyXG5cdFx0cmV0dXJuIE1hdGgubWF4KFxyXG5cdFx0XHQobGVhZGluZ1Jhbmtlci55b3UgPyBwdXJzdWluZ1JhbmtlciA6IGxlYWRpbmdSYW5rZXIpLnBvaW50cyArIG5lZWRlZFBvaW50RGlmZixcclxuXHRcdFx0aW5mb0RhdGEucG9pbnRzRm9yUHJvbW90ZVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cclxuXHRyZXF1ZXN0KHR5cGU6ICdhc3Nob2xlJyB8ICdhdXRvLXByb21vdGUnIHwgJ2JpYXMnIHwgJ211bHRpJyB8ICdwcm9tb3RlJyB8ICd2aW5lZ2FyJykge1xyXG5cdFx0aWYgKCF0aGlzLnNvY2tldCkgdGhyb3cgMDtcclxuXHRcdGlmICghdGhpcy5jYW5SZXF1ZXN0KHR5cGUsIHRoaXMuc3RhdGUueW91clJhbmtlci5hY2NvdW50SWQpKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBmYWtlUmVxdWVzdDogJU8gY2FuJ3QgZG8gJU8hYCwgdGhpcy5zdGF0ZS55b3VyUmFua2VyLCB0eXBlKTtcclxuXHRcdH1cclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoYC9hcHAvbGFkZGVyL3Bvc3QvJHt0eXBlfWAsIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pO1xyXG5cdH1cclxuXHJcblx0ZmFrZVVwZGF0ZShzZWNvbmRzUGFzc2VkOiBudW1iZXIgPSAxKSB7XHJcblx0XHR0aGlzLmNhbGN1bGF0ZUxhZGRlcihzZWNvbmRzUGFzc2VkKTtcclxuXHR9XHJcblx0ZmFrZVJlcXVlc3QoZXZlbnRUeXBlOiBTb2NrZXRMYWRkZXJFdmVudFsnZXZlbnRUeXBlJ10sIGFjY291bnRJZDogYWNjb3VudElkKSB7XHJcblx0XHRpZiAoIXRoaXMuY2FuUmVxdWVzdChldmVudFR5cGUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9fL2csICctJykgYXMgYW55LCBhY2NvdW50SWQpKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBmYWtlUmVxdWVzdDogJU8gY2FuJ3QgZG8gJU8hYCwgdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFthY2NvdW50SWRdLCBldmVudFR5cGUpO1xyXG5cdFx0fVxyXG5cdFx0c3dpdGNoIChldmVudFR5cGUpIHtcclxuXHRcdFx0Y2FzZSAnQklBUyc6XHJcblx0XHRcdGNhc2UgJ01VTFRJJzpcclxuXHRcdFx0Y2FzZSAnU09GVF9SRVNFVF9QT0lOVFMnOlxyXG5cdFx0XHRjYXNlICdQUk9NT1RFJzpcclxuXHRcdFx0Y2FzZSAnQVVUT19QUk9NT1RFJzpcclxuXHRcdFx0XHR0aGlzLmhhbmRsZUV2ZW50KHsgZXZlbnRUeXBlLCBhY2NvdW50SWQgfSk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlICdWSU5FR0FSJzoge1xyXG5cdFx0XHRcdGxldCB0YXJnZXQgPSB0aGlzLnN0YXRlLnJhbmtlcnNbMF07XHJcblx0XHRcdFx0bGV0IHNvdXJjZSA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbYWNjb3VudElkXTtcclxuXHRcdFx0XHR0aGlzLmhhbmRsZUV2ZW50KHtcclxuXHRcdFx0XHRcdGV2ZW50VHlwZSwgYWNjb3VudElkLCBkYXRhOiB7XHJcblx0XHRcdFx0XHRcdGFtb3VudDogc291cmNlLnZpbmVnYXIgKyAnJyxcclxuXHRcdFx0XHRcdFx0c3VjY2Vzczogc291cmNlLnZpbmVnYXIgPiB0YXJnZXQudmluZWdhcixcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTsgYnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRldmVudFR5cGU7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcignbm90IGltcGxlbWVudGVkJywgeyBmYWtlUmVxdWVzdDogdHJ1ZSwgZXZlbnRUeXBlLCBhY2NvdW50SWQgfSk7XHJcblx0XHRcdFx0YWxlcnQoJ25vdCBpbXBsZW1lbnRlZCcpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5jYWxjdWxhdGVMYWRkZXIoMCk7XHJcblx0fVxyXG5cclxuXHJcblxyXG5cdGdldFVwZ3JhZGVDb3N0KGxldmVsOiBudW1iZXIpIHtcclxuXHRcdHJldHVybiBNYXRoLnJvdW5kKE1hdGgucG93KHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIgKyAxLCBsZXZlbCkpO1xyXG5cdH1cclxuXHJcblx0Z2V0VmluZWdhclRocm93Q29zdCgpIHtcclxuXHRcdHJldHVybiB0aGlzLnN0YXRlLmluZm9EYXRhLmJhc2VWaW5lZ2FyTmVlZGVkVG9UaHJvdyAqIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXI7XHJcblx0fVxyXG5cclxuXHRnZXRBdXRvUHJvbW90ZUdyYXBlQ29zdChyYW5rOiBudW1iZXIpIHtcclxuXHRcdGxldCBpbmZvRGF0YSA9IHRoaXMuc3RhdGUuaW5mb0RhdGE7XHJcblx0XHRsZXQgbWluUGVvcGxlID0gTWF0aC5tYXgoaW5mb0RhdGEubWluaW11bVBlb3BsZUZvclByb21vdGUsIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIpO1xyXG5cdFx0bGV0IGRpdmlzb3IgPSBNYXRoLm1heChyYW5rIC0gbWluUGVvcGxlICsgMSwgMSk7XHJcblx0XHRyZXR1cm4gTWF0aC5mbG9vcihpbmZvRGF0YS5iYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZSAvIGRpdmlzb3IpO1xyXG5cdH1cclxuXHJcblx0Z2V0Qmlhc0Nvc3QocmFua2VyOiBSYW5rZXIpIHtcclxuXHRcdHJldHVybiB0aGlzLmdldFVwZ3JhZGVDb3N0KHJhbmtlci5iaWFzICsgMSk7XHJcblx0fVxyXG5cdGdldE11bHRpcGxpZXJDb3N0KHJhbmtlcjogUmFua2VyKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5nZXRVcGdyYWRlQ29zdChyYW5rZXIubXVsdGlwbGllcik7XHJcblx0fVxyXG5cclxuXHRjYW5SZXF1ZXN0KHR5cGU6ICdhc3Nob2xlJyB8ICdhdXRvLXByb21vdGUnIHwgJ2JpYXMnIHwgJ211bHRpJyB8ICdwcm9tb3RlJyB8ICd2aW5lZ2FyJywgYWNjb3VudElkID0gdGhpcy5zdGF0ZS55b3VyUmFua2VyLmFjY291bnRJZCkge1xyXG5cdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbYWNjb3VudElkXTtcclxuXHRcdHN3aXRjaCAodHlwZSkge1xyXG5cdFx0XHRjYXNlICdiaWFzJzoge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmdldEJpYXNDb3N0KHJhbmtlcikgPD0gcmFua2VyLnBvaW50cztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdtdWx0aSc6IHtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRNdWx0aXBsaWVyQ29zdChyYW5rZXIpIDw9IHJhbmtlci5wb3dlcjtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICd2aW5lZ2FyJzoge1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmdldFZpbmVnYXJUaHJvd0Nvc3QoKSA8PSByYW5rZXIudmluZWdhcjtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdwcm9tb3RlJzoge1xyXG5cdFx0XHRcdHJldHVybiAhISdUT0RPJztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdhdXRvLXByb21vdGUnOiB7XHJcblx0XHRcdFx0cmV0dXJuICEhJ1RPRE8nO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ2Fzc2hvbGUnOiB7XHJcblx0XHRcdFx0cmV0dXJuICEhJ1RPRE8nO1xyXG5cdFx0XHR9XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcbn1cclxuXHJcbkBHbG9iYWxDb21wb25lbnRcclxuY2xhc3MgRmFpckxhZGRlclZ1ZSBleHRlbmRzIFZ1ZVdpdGhQcm9wcyh7XHJcblx0bGFkZGVyOiBGYWlyTGFkZGVyLFxyXG59KSB7XHJcblx0QFZ1ZVRlbXBsYXRlXHJcblx0Z2V0IF90KCkge1xyXG5cdFx0bGV0IHJlY29yZCA9IHRoaXMudGFibGVEYXRhWzBdO1xyXG5cdFx0bGV0IHJhbmtlciA9IHRoaXMudGFibGVEYXRhWzBdO1xyXG5cdFx0cmV0dXJuIGBcclxuXHRcdFx0PExBRERFUj5cclxuXHRcdFx0XHQ8YS10YWJsZVxyXG5cdFx0XHRcdFx0XHQ6Y29sdW1ucz1cImNvbHVtbnNcIlxyXG5cdFx0XHRcdFx0XHQ6ZGF0YS1zb3VyY2U9XCJ0YWJsZURhdGFcIlxyXG5cdFx0XHRcdFx0XHRzaXplPVwic21hbGxcIlxyXG5cdFx0XHRcdFx0XHQ6cm93S2V5PVwiKHJlY29yZCkgPT4gcmVjb3JkLmFjY291bnRJZFwiXHJcblx0XHRcdFx0XHRcdDpyb3dDbGFzc05hbWU9XCIocmVjb3JkLCBpbmRleCk9PnJvd0NsYXNzTmFtZShyZWNvcmQpXCJcclxuXHRcdFx0XHRcdFx0OnBhZ2luYXRpb249XCJwYWdpbmF0aW9uXCJcclxuXHRcdFx0XHRcdFx0eC10YWJsZUxheW91dD1cImZpeGVkXCJcclxuXHRcdFx0XHRcdFx0PlxyXG5cdFx0XHRcdFx0ICAgIDx0ZW1wbGF0ZSAjaGVhZGVyQ2VsbD1cInsgY29sdW1uLCB0ZXh0IH1cIj5cclxuXHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgdi1pZj1cImNvbHVtbi5rZXkgPT0gJ3VzZXJuYW1lJ1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGIgc3R5bGU9XCJ3aWR0aDogMWVtO2Rpc3BsYXk6aW5saW5lLWZsZXg7XCI+XHJcblx0XHRcdFx0XHRcdFx0XHQ8L2I+VXNlcm5hbWVcclxuXHRcdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2JvZHlDZWxsPVwieyB0ZXh0LCByZWNvcmQ6IHJhbmtlciwgaW5kZXgsIGNvbHVtbiB9XCI+XHJcblx0XHRcdFx0XHRcdFx0PHRlbXBsYXRlIHYtaWY9XCJjb2x1bW4ua2V5ID09ICdyYW5rJ1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PHNwYW4gc3R5bGU9XCJvcGFjaXR5OiAwLjI7XCI+e3snMDAwMCcuc2xpY2UoKHRleHQrJycpLmxlbmd0aCl9fTwvc3Bhbj57e3RleHR9fVxyXG5cdFx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0PHRlbXBsYXRlIHYtaWY9XCJjb2x1bW4ua2V5ID09ICd1c2VybmFtZSdcIj5cclxuXHRcdFx0XHRcdFx0XHRcdDxhLXRvb2x0aXBcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRwbGFjZW1lbnQ9XCJib3R0b21MZWZ0XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxiIHN0eWxlPVwid2lkdGg6IDFlbTtkaXNwbGF5OmlubGluZS1mbGV4O2p1c3RpZnktY29udGVudDogY2VudGVyO1wiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ6c3R5bGU9XCJ7b3BhY2l0eTpyYW5rZXIudGltZXNBc3Nob2xlPzE6MC4xfVwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHske3RoaXMuYXNzaG9sZVRhZyhyYW5rZXIpIHx8ICdAJ319XHJcblx0XHRcdFx0XHRcdFx0XHRcdDwvYj57e3RleHR9fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0PHRlbXBsYXRlICN0aXRsZT5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ8ZGl2IHYtaWY9XCJyYW5rZXIudGltZXNBc3Nob2xlXCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRQcmVzc2VkIEFzc2hvbGUgQnV0dG9uIHt7cmFua2VyLnRpbWVzQXNzaG9sZX19IHRpbWVzXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0PGRpdiB2LWlmPVwiIXJhbmtlci5ncm93aW5nXCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRQcm9tb3RlZFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlkOnt7cmFua2VyLmFjY291bnRJZH19XHJcblx0XHRcdFx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0XHQ8L2EtdG9vbHRpcD5cclxuXHRcdFx0XHRcdFx0XHRcdDxkaXYgc3R5bGU9XCJmbG9hdDogcmlnaHQ7XCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxkaXZcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHYtZm9yPVwiYSBvZiAke3RoaXMuZ2V0VmlzaWJsZUV2ZW50cyhyYW5rZXIpfVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzdHlsZT1cImRpc3BsYXk6IGlubGluZS1ibG9jazsgd2lkdGg6IDFjaDtcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0OnN0eWxlPVwie29wYWNpdHk6IGEub3BhY2l0eSwgY29sb3I6IGEuZGVsdGE+MD8ncmVkJzonZ3JlZW4nfVwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0e3sgYS5kZWx0YSA+IDAgPyAn4pa8JyA6ICfilrInIH19XHJcblx0XHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHRcdFx0XHRcclxuXHJcblx0XHRcdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHQ8L2EtdGFibGU+XHJcblx0XHRcdDwvTEFEREVSPlxyXG5cdFx0YFxyXG5cdH1cclxuXHRwYWdlU2l6ZSA9IDI5Oy8vMTU7XHJcblx0Y3VycmVudFBhZ2UgPSAtMTtcclxuXHRnZXQgcGFnaW5hdGlvbigpOiBhbnRkLlRhYmxlUHJvcHM8UmFua2VyPlsncGFnaW5hdGlvbiddIHtcclxuXHRcdGlmICh0aGlzLmN1cnJlbnRQYWdlID09IC0xKSB7XHJcblx0XHRcdHRoaXMuY3VycmVudFBhZ2UgPSBNYXRoLmNlaWwodGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5yYW5rIC8gdGhpcy5wYWdlU2l6ZSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRkZWZhdWx0UGFnZVNpemU6IHRoaXMucGFnZVNpemUsXHJcblx0XHRcdGRlZmF1bHRDdXJyZW50OiB0aGlzLmN1cnJlbnRQYWdlLFxyXG5cdFx0XHQvLyBoaWRlT25TaW5nbGVQYWdlOiB0cnVlLFxyXG5cdFx0XHRwYWdlU2l6ZTogdGhpcy5wYWdlU2l6ZSxcclxuXHRcdFx0c2hvd1NpemVDaGFuZ2VyOiB0cnVlLFxyXG5cdFx0XHRjdXJyZW50OiB0aGlzLmN1cnJlbnRQYWdlLFxyXG5cdFx0XHRvbkNoYW5nZTogKHBhZ2U6IG51bWJlciwgc2l6ZTogbnVtYmVyKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50UGFnZSA9IHBhZ2U7XHJcblx0XHRcdH0sXHJcblx0XHRcdG9uU2hvd1NpemVDaGFuZ2U6IChwYWdlOiBudW1iZXIsIHNpemU6IG51bWJlcikgPT4ge1xyXG5cdFx0XHRcdHRoaXMucGFnZVNpemUgPSBzaXplO1xyXG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50UGFnZSA9IE1hdGguY2VpbCh0aGlzLmxhZGRlci5zdGF0ZS55b3VyUmFua2VyLnJhbmsgLyB0aGlzLnBhZ2VTaXplKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKHtcclxuXHRcdFx0XHRcdFx0cmFuazogdGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5yYW5rLFxyXG5cdFx0XHRcdFx0XHRwYWdlOiB0aGlzLmN1cnJlbnRQYWdlLFxyXG5cdFx0XHRcdFx0XHRzaXplXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRwYWdlU2l6ZU9wdGlvbnM6IEFycmF5KDMwKS5maWxsKDApLm1hcCgoZSwgaSkgPT4gaSArIDEpLnJldmVyc2UoKSxcclxuXHRcdH07XHJcblx0fVxyXG5cdGNvbHVtbnM6IEV4Y2x1ZGU8YW50ZC5UYWJsZVByb3BzPFJhbmtlcj5bJ2NvbHVtbnMnXSwgdW5kZWZpbmVkPiA9IFtcclxuXHRcdHsgdGl0bGU6ICcjJywgZGF0YUluZGV4OiAncmFuaycsIGtleTogJ3JhbmsnLCB3aWR0aDogJ2NhbGMoMTZweCArIDRjaCknLCBhbGlnbjogJ3JpZ2h0JyB9LFxyXG5cdFx0eyB0aXRsZTogJ1VzZXJuYW1lJywgZGF0YUluZGV4OiAndXNlcm5hbWUnLCBrZXk6ICd1c2VybmFtZScgfSxcclxuXHRcdHsgdGl0bGU6ICdQb3dlcicsIGRhdGFJbmRleDogJ3Bvd2VyRm9ybWF0dGVkJywga2V5OiAncG93ZXInLCBhbGlnbjogJ3JpZ2h0Jywgd2lkdGg6ICczMCUnIH0sXHJcblx0XHR7IHRpdGxlOiAnUG9pbnRzJywgZGF0YUluZGV4OiAncG9pbnRzRm9ybWF0dGVkJywga2V5OiAncG9pbnRzJywgYWxpZ246ICdyaWdodCcsIHdpZHRoOiAnMzAlJyB9LFxyXG5cdF07XHJcblx0Y29uc3RydWN0b3IoLi4uYTogYW55W10pIHtcclxuXHRcdHN1cGVyKC4uLmEpO1xyXG5cdFx0dGhpcy5jb2x1bW5zWzFdLmZpbHRlcnMgPSBbXHJcblx0XHRcdHsgdGV4dDogJ0NlbnRlciB5b3Vyc2VsZicsIHZhbHVlOiB0cnVlIH1cclxuXHRcdF07XHJcblx0XHR0aGlzLmNvbHVtbnNbMV0ub25GaWx0ZXIgPSAodmFsdWUsIHJhbmtlcjogUmFua2VyKSA9PiB7XHJcblx0XHRcdGlmICghdmFsdWUpIHJldHVybiB0cnVlO1xyXG5cdFx0XHRpZiAocmFua2VyLnJhbmsgPT0gMSkgcmV0dXJuIHRydWU7XHJcblx0XHRcdHJldHVybiB0aGlzLmNlbnRlcmVkTGltaXRzLm1pbiA8PSByYW5rZXIucmFua1xyXG5cdFx0XHRcdCYmIHJhbmtlci5yYW5rIDw9IHRoaXMuY2VudGVyZWRMaW1pdHMubWF4O1xyXG5cdFx0fVxyXG5cdH1cclxuXHRnZXQgY2VudGVyZWRMaW1pdHMoKSB7XHJcblx0XHRsZXQgc3RhdGUgPSB0aGlzLmxhZGRlci5zdGF0ZTtcclxuXHRcdGxldCBoYWxmID0gfn4odGhpcy5wYWdlU2l6ZSAvIDIpLCBleHRyYSA9IHRoaXMucGFnZVNpemUgJSAyO1xyXG5cdFx0bGV0IG1pZGRsZVJhbmsgPSBzdGF0ZS55b3VyUmFua2VyLnJhbms7XHJcblx0XHRtaWRkbGVSYW5rID0gTWF0aC5taW4obWlkZGxlUmFuaywgc3RhdGUucmFua2Vycy5sZW5ndGggLSBoYWxmKTtcclxuXHRcdG1pZGRsZVJhbmsgPSBNYXRoLm1heChtaWRkbGVSYW5rLCBoYWxmICsgMSk7XHJcblx0XHRyZXR1cm4geyBtaW46IG1pZGRsZVJhbmsgLSBoYWxmICsgMSwgbWF4OiBtaWRkbGVSYW5rICsgaGFsZiAtIDEgKyBleHRyYSB9O1xyXG5cdH1cclxuXHRnZXQgdGFibGVEYXRhKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMubGFkZGVyLnN0YXRlLnJhbmtlcnM7XHJcblx0fVxyXG5cdHJvd0NsYXNzTmFtZShyZWNvcmQ6IFJhbmtlcikge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0J3Jhbmtlci1yb3cteW91JzogcmVjb3JkLnlvdSxcclxuXHRcdFx0J3Jhbmtlci1yb3ctcHJvbW90ZWQnOiAhcmVjb3JkLmdyb3dpbmcsXHJcblx0XHR9O1xyXG5cdH1cclxuXHRhc3Nob2xlVGFnKHJhbmtlcjogUmFua2VyKSB7XHJcblx0XHRsZXQgdGFncyA9IHRoaXMubGFkZGVyLnN0YXRlLmluZm9EYXRhLmFzc2hvbGVUYWdzO1xyXG5cdFx0aWYgKHJhbmtlci50aW1lc0Fzc2hvbGUgPCB0YWdzLmxlbmd0aCkgcmV0dXJuIHRhZ3NbcmFua2VyLnRpbWVzQXNzaG9sZV07XHJcblx0XHRyZXR1cm4gdGFnc1t0YWdzLmxlbmd0aCAtIDFdO1xyXG5cdH1cclxuXHJcblx0Z2V0VmlzaWJsZUV2ZW50cyhyYW5rZXI6IFJhbmtlcikge1xyXG5cdFx0Y29uc3QgdmlzaWJsZUR1cmF0aW9uID0gMTA7XHJcblx0XHRjb25zdCBkaXNhcHBlYXJEdXJhdGlvbiA9IDEwO1xyXG5cdFx0bGV0IG5vdyA9IHRoaXMubGFkZGVyLnN0YXRlLmN1cnJlbnRUaW1lO1xyXG5cdFx0cmV0dXJuIHJhbmtlci5yYW5rSGlzdG9yeVxyXG5cdFx0XHQubWFwKGUgPT4ge1xyXG5cdFx0XHRcdGxldCB0aW1lU2luY2UgPSBub3cgLSBlLmN1cnJlbnRUaW1lO1xyXG5cdFx0XHRcdGxldCBvcGFjaXR5ID0gdGltZVNpbmNlIDwgdmlzaWJsZUR1cmF0aW9uID8gMSA6ICgxIC0gKHRpbWVTaW5jZSAtIHZpc2libGVEdXJhdGlvbikgLyBkaXNhcHBlYXJEdXJhdGlvbik7XHJcblx0XHRcdFx0cmV0dXJuIHsgZGVsdGE6IGUucmFuayAtIGUub2xkUmFuaywgb3BhY2l0eSB9O1xyXG5cdFx0XHR9KS5maWx0ZXIoZSA9PiBlLm9wYWNpdHkgPiAwKVxyXG5cdFx0XHQuZmxhdE1hcChlID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gQXJyYXkoTWF0aC5hYnMoZS5kZWx0YSkpLmZpbGwoZSk7XHJcblx0XHRcdH0pXHJcblx0XHRcdC5zbGljZSgtMTApLnJldmVyc2UoKTtcclxuXHR9XHJcbn0iXX0=