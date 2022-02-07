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
    history = Vue.shallowReactive([]);
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
    pushHistory(type, data) {
        if (data.oldRank == 0)
            data.oldRank = this.rank;
        let entry = {
            type,
            delta: this.rank - data.oldRank,
            rank: this.rank,
            ...data,
        };
        // Object.freeze(entry);
        this.history.unshift(entry);
        if (this.history.length > 30)
            this.history.pop();
        return entry;
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
        let currentTime = this.state.currentTime;
        switch (event.eventType) {
            case 'BIAS': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.bias++;
                ranker.points = 0;
                ranker.pushHistory('BIAS', { currentTime, oldRank: 0 });
                break;
            }
            case 'MULTI': {
                let ranker = this.state.rankersById[event.accountId];
                ranker.multiplier++;
                ranker.bias = 0;
                ranker.points = 0;
                ranker.power = 0;
                ranker.pushHistory('MULTI', { currentTime, oldRank: 0 });
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
                if (ranker.username.includes('\\u')) {
                    try {
                        ranker.username = JSON.parse(`"${ranker.username}"`);
                    }
                    catch { }
                }
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
            assholeLadder: message.content.assholeLadder,
            assholeTags: message.content.assholeTags.map(unescapeHtml),
            autoPromoteLadder: message.content.autoPromoteLadder,
            baseGrapesNeededToAutoPromote: +message.content.baseGrapesNeededToAutoPromote,
            baseVinegarNeededToThrow: +message.content.baseVinegarNeededToThrow,
            manualPromoteWaitTime: message.content.manualPromoteWaitTime,
            minimumPeopleForPromote: message.content.minimumPeopleForPromote,
            pointsForPromote: +message.content.pointsForPromote,
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
        let currentTime = this.state.currentTime;
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
            let newRank = index + 1;
            let oldRank = ranker.rank;
            if (newRank == oldRank)
                return;
            ranker.rank = newRank;
            if (newRank < oldRank)
                ranker.pushHistory('UPRANK', { currentTime, oldRank });
            else
                ranker.pushHistory('DOWNRANK', { currentTime, oldRank });
            if (newRank < oldRank) {
                // rank increase, gain grapes
                for (let r = oldRank; r < newRank; r++) {
                    // let otherRanker = rankersOld[r];
                    if (ranker.growing && (ranker.bias > 0 || ranker.multiplier > 1)) {
                        ranker.grapes++;
                    }
                }
            }
        });
        // Ranker on Last Place gains 1 Grape, only if he isn't the only one
        if (this.state.rankers.length >= Math.max(this.state.infoData.minimumPeopleForPromote, this.state.currentLadder.number)) {
            let lastRanker = this.state.rankers[this.state.rankers.length - 1];
            if (lastRanker.growing) {
                lastRanker.grapes += ~~secondsPassed;
                lastRanker.pushHistory('LAST', { currentTime, oldRank: 0 });
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
        return this.getUpgradeCost(ranker.multiplier + 1);
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
        let h = this.getHistory(ranker)[0];
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
							<div style="float: right;" v-if="1">
								<b v-for="${h} of ${this.getHistory(ranker)}"
									style="display: inline-block;text-align:right;"
									:style="h.style"
								>{${h.text}}</b>
							</div>
							

						</template>
					</template>
					<template #footer>
						
						<a-row type="flex" style="align-items: center;">
							<a-col flex="9" />
							<a-col flex="1" style="padding: 0 8px;">
								<div style="white-space: nowrap;">
									can:{${this.bias.can}}
									({${this.bias.sPoints}} / {${this.bias.sCost}})
									[{${this.bias.sValue}}]
								</div>
							</a-col>
							<a-col flex="30%">
								<a-progress size="small" :percent="${this.bias.percent}" />
							</a-col>
							<a-col flex="70px">
								<a-button type="primary" class="button-green" :disabled="${!this.bias.canRequest}" @click="${this.bias.doRequest()}" block>
									Bias
								</a-button>
							</a-col>
						</a-row>
						<a-row type="flex" style="align-items: center;">
							<a-col flex="9" />
							<a-col flex="1" style="padding: 0 8px;">
								<div style="white-space: nowrap;">
									can:{${this.multi.can}}
									({${this.multi.sPoints}} / {${this.multi.sCost}})
									[{${this.multi.sValue}}]
								</div>
							</a-col>
							<a-col flex="30%">
								<a-progress size="small" :percent="${this.multi.percent}" />
							</a-col>
							<a-col flex="70px">
								<a-button type="primary" :disabled="${!this.multi.canRequest}" @click="${this.multi.doRequest()}" block>
									Multi
								</a-button>
							</a-col>
						</a-row>
						
					</template>
				</a-table>
			</LADDER>
		`;
    }
    pageSize = 15;
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
        return ranker.history
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
    getHistory(ranker) {
        // console.time()
        const visibleDuration = 10;
        const disappearDuration = 10;
        let now = this.ladder.state.currentTime;
        const texts = {
            UPRANK: '▲',
            DOWNRANK: '▼',
            LAST: '🥝',
            BIAS: ' B ',
            MULTI: ' M ',
        };
        const styleMap = {
            UPRANK: 'color:green;width:1ch;',
            DOWNRANK: 'color:red;width:1ch;',
            LAST: 'width:1ch;',
            BIAS: 'color:blue;width:2ch;',
            MULTI: 'color:purple;width:2ch;',
        };
        let v = Vue.toRaw(ranker.history).slice(0, 10)
            .flatMap(e => {
            let timeSince = now - e.currentTime;
            let opacity = timeSince < visibleDuration ? 1 : (1 - (timeSince - visibleDuration) / disappearDuration);
            if (opacity <= 0)
                return [];
            let text = texts[e.type] || ` ?${e.type}? `;
            let style = `opacity:${opacity}; ${styleMap[e.type] || ''}`;
            let data = { text, style, ...e };
            if (e.type != 'DOWNRANK' && e.type != 'UPRANK')
                return [data];
            else
                return Array(Math.abs(e.delta)).fill(0).map(e => data);
        }).slice(0, 10).reverse();
        // console.timeEnd()
        return Vue.markRaw(v);
    }
    format(n) {
        return numberFormatter.format(n);
    }
    get bias() {
        let value = this.ladder.state.yourRanker.bias;
        let cost = this.ladder.getBiasCost();
        let points = this.ladder.state.yourRanker.points;
        return {
            value, cost, points,
            can: points >= cost,
            percent: Math.min(100, Math.floor(points / cost * 100)),
            sValue: '+' + value.toString().padStart(2, '0'),
            sCost: this.format(cost),
            sPoints: this.format(points),
            canRequest: this.ladder.canRequest('bias'),
            doRequest: () => {
                this.ladder.request('bias');
            },
        };
    }
    get multi() {
        let value = this.ladder.state.yourRanker.multiplier;
        let cost = this.ladder.getMultiplierCost();
        let points = this.ladder.state.yourRanker.power;
        return {
            value, cost, points,
            can: points >= cost,
            percent: Math.min(100, Math.floor(points / cost * 100)),
            sValue: 'x' + value.toString().padStart(2, '0'),
            sCost: this.format(cost),
            sPoints: this.format(points),
            canRequest: this.ladder.canRequest('multi'),
            doRequest: () => {
                this.ladder.request('multi');
            },
        };
    }
    frameDuration = '';
    frames = '';
    mounted() {
        void (async () => {
            let frames = [0];
            let last = performance.now();
            while (1) {
                await new Promise(requestAnimationFrame);
                let now = performance.now();
                let delta = now - last;
                if (delta > 30)
                    frames.unshift(delta);
                last = now;
                if (frames.length > 30)
                    frames.pop();
                this.frames = frames.map(e => e.toFixed(0).padStart(3, '0')).join(', ');
                this.frameDuration = frames.slice(0, 10)
                    .reduce((v, e, i, a) => v + e / a.length, 0).toFixed(3);
            }
        })();
    }
};
__decorate([
    VueTemplate
], FairLadderVue.prototype, "_t", null);
FairLadderVue = __decorate([
    GlobalComponent
], FairLadderVue);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFkZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xhZGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBR0EsTUFBTSxNQUFNO0lBQ1g7UUFDQyxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztDQUNEO0FBZ0JELE1BQU0sTUFBTTtJQUNYLFNBQVMsR0FBYyxDQUFDLENBQUM7SUFDekIsUUFBUSxHQUFXLEVBQUUsQ0FBQztJQUN0QixNQUFNLEdBQVcsQ0FBQyxDQUFDO0lBQ25CLEtBQUssR0FBVyxDQUFDLENBQUM7SUFDbEIsSUFBSSxHQUFXLENBQUMsQ0FBQztJQUNqQixVQUFVLEdBQVcsQ0FBQyxDQUFDO0lBQ3ZCLEdBQUcsR0FBWSxLQUFLLENBQUM7SUFDckIsT0FBTyxHQUFZLElBQUksQ0FBQztJQUN4QixZQUFZLEdBQVcsQ0FBQyxDQUFDO0lBQ3pCLE1BQU0sR0FBVyxDQUFDLENBQUM7SUFDbkIsT0FBTyxHQUFXLENBQUMsQ0FBQztJQUVwQixJQUFJLEdBQVcsQ0FBQyxDQUFDO0lBQ2pCLFdBQVcsR0FBWSxLQUFLLENBQUM7SUFFN0IsT0FBTyxHQUF5RCxHQUFHLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBSXhGLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBc0M7UUFDakQsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUN6RCxNQUFNLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztRQUNwQyxNQUFNLENBQUMs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QUcsR0FBRyxDQUFDO2dCQUNYLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFFO29CQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN4RSxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztxQkFDdEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3pEO1FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUNMLENBQUM7Q0FDRCxDQUFBO0FBeFJBO0lBREMsV0FBVzt1Q0FrR1g7QUFyR0ksYUFBYTtJQURsQixlQUFlO0dBQ1YsYUFBYSxDQTRSbEIiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcblxyXG5jbGFzcyBQbGF5ZXIge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0cmV0dXJuIFZ1ZS5yZWFjdGl2ZSh0aGlzKTtcclxuXHR9XHJcbn1cclxuXHJcbnR5cGUgX01ha2VSYW5rZXJIaXN0b3J5RXZlbnQ8VCBleHRlbmRzIHN0cmluZywgRCBleHRlbmRzIHt9ID0ge30+ID0ge1xyXG5cdHR5cGU6IFQsIGRlbHRhOiBudW1iZXIsIHJhbms6IG51bWJlciwgb2xkUmFuazogbnVtYmVyLCBjdXJyZW50VGltZTogbnVtYmVyLFxyXG59ICYgRDtcclxuXHJcbnR5cGUgUmFua2VySGlzdG9yeUV2ZW50TWFwID0ge1xyXG5cdCdVUFJBTksnOiBfTWFrZVJhbmtlckhpc3RvcnlFdmVudDwnVVBSQU5LJz4sXHJcblx0J0RPV05SQU5LJzogX01ha2VSYW5rZXJIaXN0b3J5RXZlbnQ8J0RPV05SQU5LJz4sXHJcblx0J01VTFRJJzogX01ha2VSYW5rZXJIaXN0b3J5RXZlbnQ8J01VTFRJJz4sXHJcblx0J0JJQVMnOiBfTWFrZVJhbmtlckhpc3RvcnlFdmVudDwnQklBUyc+LFxyXG5cdCdMQVNUJzogX01ha2VSYW5rZXJIaXN0b3J5RXZlbnQ8J0xBU1QnPixcclxuXHQnVEhST1dfVklORUdBUic6IF9NYWtlUmFua2VySGlzdG9yeUV2ZW50PCdUSFJPV19WSU5FR0FSJywgeyB0YXJnZXQ6IGFjY291bnRJZCwgYW1vdW50OiBudW1iZXIsIHN1Y2Nlc3M6IGJvb2xlYW4gfT4sXHJcblx0J0dPVF9WSU5FR0FSRUQnOiBfTWFrZVJhbmtlckhpc3RvcnlFdmVudDwnR09UX1ZJTkVHQVJFRCcsIHsgc291cmNlOiBhY2NvdW50SWQsIGFtb3VudDogbnVtYmVyLCBzdWNjZXNzOiBib29sZWFuIH0+LFxyXG59O1xyXG5cclxuY2xhc3MgUmFua2VyIHtcclxuXHRhY2NvdW50SWQ6IGFjY291bnRJZCA9IDA7XHJcblx0dXNlcm5hbWU6IHN0cmluZyA9ICcnO1xyXG5cdHBvaW50czogbnVtYmVyID0gMDtcclxuXHRwb3dlcjogbnVtYmVyID0gMTtcclxuXHRiaWFzOiBudW1iZXIgPSAwO1xyXG5cdG11bHRpcGxpZXI6IG51bWJlciA9IDE7XHJcblx0eW91OiBib29sZWFuID0gZmFsc2U7XHJcblx0Z3Jvd2luZzogYm9vbGVhbiA9IHRydWU7XHJcblx0dGltZXNBc3Nob2xlOiBudW1iZXIgPSAwO1xyXG5cdGdyYXBlczogbnVtYmVyID0gMDtcclxuXHR2aW5lZ2FyOiBudW1iZXIgPSAwO1xyXG5cclxuXHRyYW5rOiBudW1iZXIgPSAwO1xyXG5cdGF1dG9Qcm9tb3RlOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG5cdGhpc3Rvcnk6IFJhbmtlckhpc3RvcnlFdmVudE1hcFtrZXlvZiBSYW5rZXJIaXN0b3J5RXZlbnRNYXBdW10gPSBWdWUuc2hhbGxvd1JlYWN0aXZlKFtdKTtcclxuXHJcblx0c3RhdGljIGZyb20oc291cmNlOiBTb2NrZXRZb3VSYW5rZXIpOiBZb3VSYW5rZXI7XHJcblx0c3RhdGljIGZyb20oc291cmNlOiBTb2NrZXRSYW5rZXIpOiBSYW5rZXI7XHJcblx0c3RhdGljIGZyb20oc291cmNlOiBTb2NrZXRSYW5rZXIgfCBTb2NrZXRZb3VSYW5rZXIpOiBSYW5rZXIgfCBZb3VSYW5rZXIge1xyXG5cdFx0bGV0IHJhbmtlciA9IHNvdXJjZS55b3UgPyBuZXcgWW91UmFua2VyKCkgOiBuZXcgUmFua2VyKCk7XHJcblx0XHRyYW5rZXIudXNlcm5hbWUgPSB1bmVzY2FwZUh0bWwoc291cmNlLnVzZXJuYW1lKTtcclxuXHRcdHJhbmtlci55b3UgPSBzb3VyY2UueW91O1xyXG5cdFx0cmFua2VyLmFjY291bnRJZCA9IHNvdXJjZS5hY2NvdW50SWQ7XHJcblx0XHRyYW5rZXIuYmlhcyA9IHNvdXJjZS5iaWFzO1xyXG5cdFx0cmFua2VyLmdyb3dpbmcgPSBzb3VyY2UuZ3Jvd2luZztcclxuXHRcdHJhbmtlci5tdWx0aXBsaWVyID0gc291cmNlLm11bHRpcGxpZXI7XHJcblx0XHRyYW5rZXIucmFuayA9IHNvdXJjZS5yYW5rO1xyXG5cdFx0cmFua2VyLnRpbWVzQXNzaG9sZSA9IHNvdXJjZS50aW1lc0Fzc2hvbGU7XHJcblx0XHRyYW5rZXIucG9pbnRzID0gK3NvdXJjZS5wb2ludHM7XHJcblx0XHRyYW5rZXIucG93ZXIgPSArc291cmNlLnBvd2VyO1xyXG5cdFx0aWYgKHNvdXJjZS55b3UpIHtcclxuXHRcdFx0bGV0IHlvdVNvdXJjZSA9IHNvdXJjZSBhcyBTb2NrZXRZb3VSYW5rZXI7XHJcblx0XHRcdGxldCB5b3VSYW5rZXIgPSByYW5rZXIgYXMgWW91UmFua2VyO1xyXG5cdFx0XHR5b3VSYW5rZXIuYXV0b1Byb21vdGUgPSB5b3VTb3VyY2UuYXV0b1Byb21vdGU7XHJcblx0XHRcdHlvdVJhbmtlci5ncmFwZXMgPSAreW91U291cmNlLmdyYXBlcztcclxuXHRcdFx0eW91UmFua2VyLnZpbmVnYXIgPSAreW91U291cmNlLnZpbmVnYXI7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gcmFua2VyO1xyXG5cdH1cclxuXHJcblx0Z2V0IHBvd2VyRm9ybWF0dGVkKCkge1xyXG5cdFx0cmV0dXJuIGAke251bWJlckZvcm1hdHRlci5mb3JtYXQodGhpcy5wb3dlcilcclxuXHRcdFx0fSBbKyR7KHRoaXMuYmlhcyArICcnKS5wYWRTdGFydCgyLCAnMCcpXHJcblx0XHRcdH0geCR7KHRoaXMubXVsdGlwbGllciArICcnKS5wYWRTdGFydCgyLCAnMCcpXHJcblx0XHRcdH1dYDtcclxuXHR9XHJcblx0Z2V0IHBvaW50c0Zvcm1hdHRlZCgpIHtcclxuXHRcdHJldHVybiBudW1iZXJGb3JtYXR0ZXIuZm9ybWF0KHRoaXMucG9pbnRzKTtcclxuXHR9XHJcblxyXG5cdHB1c2hIaXN0b3J5PFQgZXh0ZW5kcyBrZXlvZiBSYW5rZXJIaXN0b3J5RXZlbnRNYXA+KFxyXG5cdFx0dHlwZTogVCwgZGF0YTogT21pdDxSYW5rZXJIaXN0b3J5RXZlbnRNYXBbVF0sICd0eXBlJyB8ICdkZWx0YScgfCAncmFuayc+XHJcblx0KSB7XHJcblx0XHRpZiAoZGF0YS5vbGRSYW5rID09IDApIGRhdGEub2xkUmFuayA9IHRoaXMucmFuaztcclxuXHJcblx0XHRsZXQgZW50cnk6IFJhbmtlckhpc3RvcnlFdmVudE1hcFtrZXlvZiBSYW5rZXJIaXN0b3J5RXZlbnRNYXBdIHwgX01ha2VSYW5rZXJIaXN0b3J5RXZlbnQ8c3RyaW5nPiA9IHtcclxuXHRcdFx0dHlwZSxcclxuXHRcdFx0ZGVsdGE6IHRoaXMucmFuayAtIGRhdGEub2xkUmFuayxcclxuXHRcdFx0cmFuazogdGhpcy5yYW5rLFxyXG5cdFx0XHQuLi5kYXRhLFxyXG5cdFx0fTtcclxuXHRcdC8vIE9iamVjdC5mcmVlemUoZW50cnkpO1xyXG5cdFx0dGhpcy5oaXN0b3J5LnVuc2hpZnQoZW50cnkgYXMgUmFua2VySGlzdG9yeUV2ZW50TWFwW2tleW9mIFJhbmtlckhpc3RvcnlFdmVudE1hcF0pO1xyXG5cdFx0aWYgKHRoaXMuaGlzdG9yeS5sZW5ndGggPiAzMCkgdGhpcy5oaXN0b3J5LnBvcCgpO1xyXG5cdFx0cmV0dXJuIGVudHJ5IGFzIFJhbmtlckhpc3RvcnlFdmVudE1hcFtUXTtcclxuXHR9XHJcblx0Ly8gZ2V0VW5pcXVlSGlzdG9yeSgpOiBSYW5rZXJbJ2hpc3RvcnknXSB7XHJcblx0Ly8gXHRsZXQgZmlyc3QgPSB0aGlzLmhpc3RvcnlbMF07XHJcblx0Ly8gXHRyZXR1cm4gVnVlLm1hcmtSYXcoXHJcblx0Ly8gXHRcdFZ1ZS50b1Jhdyh0aGlzLmhpc3RvcnkpLmZsYXRNYXAoZSA9PiB7XHJcblx0Ly8gXHRcdFx0aWYgKE1hdGguYWJzKGUuZGVsdGEpIDw9IDEpIHJldHVybiBbZV07XHJcblx0Ly8gXHRcdFx0cmV0dXJuIEFycmF5KE1hdGguYWJzKGUuZGVsdGEpKS5maWxsKGUpIGFzICh0eXBlb2YgZSlbXTtcclxuXHQvLyBcdFx0fSlcclxuXHQvLyBcdCk7XHJcblx0Ly8gfVxyXG59XHJcbmNsYXNzIFlvdVJhbmtlciBleHRlbmRzIFJhbmtlciB7XHJcblx0eW91ID0gdHJ1ZTtcclxufVxyXG5cclxuY2xhc3MgRmFpckxhZGRlciB7XHJcblx0c29ja2V0PzogRmFpclNvY2tldDtcclxuXHR1c2VyRGF0YSA9IG5ldyBVc2VyRGF0YSgpO1xyXG5cdHN0YXRlID0gVnVlUmVhY3RpdmUoe1xyXG5cdFx0Y29ubmVjdGVkOiBmYWxzZSxcclxuXHRcdGNvbm5lY3Rpb25SZXF1ZXN0ZWQ6IGZhbHNlLFxyXG5cdFx0cmFua2Vyc0J5SWQ6IHt9IGFzIFJlY29yZDxhY2NvdW50SWQsIFJhbmtlcj4sXHJcblx0XHRsYWRkZXJOdW06IDEsXHJcblxyXG5cdFx0dmluZWdhcmVkOiB7XHJcblx0XHRcdGp1c3RWaW5lZ2FyZWQ6IGZhbHNlLFxyXG5cdFx0XHR2aW5lZ2FyZWRCeTogbmV3IFJhbmtlcigpLFxyXG5cdFx0XHR2aW5lZ2FyVGhyb3duOiAwLFxyXG5cdFx0fSxcclxuXHJcblx0XHRjdXJyZW50TGFkZGVyOiB7XHJcblx0XHRcdG51bWJlcjogMCxcclxuXHRcdH0sXHJcblx0XHR5b3VyUmFua2VyOiBuZXcgWW91UmFua2VyKCksXHJcblx0XHRmaXJzdFJhbmtlcjogbmV3IFJhbmtlcigpLFxyXG5cdFx0cmFua2VyczogW25ldyBSYW5rZXIoKV0sXHJcblx0XHRzdGFydFJhbms6IDAsXHJcblxyXG5cdFx0aW5mb0RhdGE6IHtcclxuXHRcdFx0cG9pbnRzRm9yUHJvbW90ZTogMjUwMDAwMDAwLFxyXG5cdFx0XHRtaW5pbXVtUGVvcGxlRm9yUHJvbW90ZTogMTAsXHJcblx0XHRcdGFzc2hvbGVMYWRkZXI6IDE1LFxyXG5cdFx0XHRhc3Nob2xlVGFnczogW1wiXCIsIFwi4pmgXCIsIFwi4pmjXCIsIFwi4pmlXCIsIFwi4pmmXCJdLFxyXG5cdFx0XHRiYXNlVmluZWdhck5lZWRlZFRvVGhyb3c6IDEwMDAwMDAsXHJcblx0XHRcdGJhc2VHcmFwZXNOZWVkZWRUb0F1dG9Qcm9tb3RlOiAyMDAwLFxyXG5cdFx0XHRtYW51YWxQcm9tb3RlV2FpdFRpbWU6IDE1LFxyXG5cdFx0XHRhdXRvUHJvbW90ZUxhZGRlcjogMlxyXG5cdFx0fSxcclxuXHJcblx0XHRwb2ludHNOZWVkZWRGb3JNYW51YWxQcm9tb3RlOiAwLFxyXG5cclxuXHRcdGN1cnJlbnRUaW1lOiAwLFxyXG5cdH0pO1xyXG5cdGxhZGRlclN1YnNjcmlwdGlvbjogYW55O1xyXG5cdGNvbm5lY3QoKSB7XHJcblx0XHRpZiAoIXRoaXMuc29ja2V0KSB0aHJvdyAwO1xyXG5cdFx0aWYgKCF0aGlzLnVzZXJEYXRhLnV1aWQpIHRocm93IDA7XHJcblx0XHRpZiAodGhpcy5zdGF0ZS5jb25uZWN0ZWQgfHwgdGhpcy5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkKSByZXR1cm4gZmFsc2U7XHJcblx0XHR0aGlzLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQgPSB0cnVlO1xyXG5cclxuXHRcdHRoaXMubGFkZGVyU3Vic2NyaXB0aW9uID0gdGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdG9waWMvbGFkZGVyLyRsYWRkZXJOdW0nLCAoZGF0YSkgPT4ge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUxhZGRlclVwZGF0ZXMoZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9LCB0aGlzLnN0YXRlLmxhZGRlck51bSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdXNlci9xdWV1ZS9sYWRkZXIvJywgKGRhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVMYWRkZXJJbml0KGRhdGEpO1xyXG5cdFx0fSwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc3Vic2NyaWJlKCcvdXNlci9xdWV1ZS9sYWRkZXIvdXBkYXRlcycsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlUHJpdmF0ZUxhZGRlclVwZGF0ZXMoZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KTtcclxuXHJcblx0XHR0aGlzLnNvY2tldC5zZW5kKCcvYXBwL2xhZGRlci9pbml0LyRsYWRkZXJOdW0nXHJcblx0XHRcdCwgeyB1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQgfSwgdGhpcy5zdGF0ZS5sYWRkZXJOdW0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3VzZXIvcXVldWUvaW5mbycsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlSW5mbyhkYXRhKTtcclxuXHRcdH0sIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoJy9hcHAvaW5mbydcclxuXHRcdFx0LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9KVxyXG5cclxuXHR9XHJcblx0ZGlzY29ubmVjdCgpIHtcclxuXHRcdC8vIHRvZG9cclxuXHR9XHJcblxyXG5cclxuXHRoYW5kbGVMYWRkZXJVcGRhdGVzKG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3RvcGljL2xhZGRlci8kbGFkZGVyTnVtJ10pIHtcclxuXHRcdGZvciAobGV0IGV2ZW50IG9mIG1lc3NhZ2UuZXZlbnRzKSB7XHJcblx0XHRcdHRoaXMuaGFuZGxlRXZlbnQoZXZlbnQpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5jYWxjdWxhdGVMYWRkZXIobWVzc2FnZS5zZWNvbmRzUGFzc2VkKTtcclxuXHR9XHJcblxyXG5cdGhhbmRsZUV2ZW50KGV2ZW50OiBTb2NrZXRMYWRkZXJFdmVudCkge1xyXG5cdFx0Y29uc29sZS5sb2coZXZlbnQpO1xyXG5cdFx0bGV0IGN1cnJlbnRUaW1lID0gdGhpcy5zdGF0ZS5jdXJyZW50VGltZTtcclxuXHJcblx0XHRzd2l0Y2ggKGV2ZW50LmV2ZW50VHlwZSkge1xyXG5cdFx0XHRjYXNlICdCSUFTJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLmJpYXMrKztcclxuXHRcdFx0XHRyYW5rZXIucG9pbnRzID0gMDtcclxuXHRcdFx0XHRyYW5rZXIucHVzaEhpc3RvcnkoJ0JJQVMnLCB7IGN1cnJlbnRUaW1lLCBvbGRSYW5rOiAwIH0pO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ01VTFRJJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLm11bHRpcGxpZXIrKztcclxuXHRcdFx0XHRyYW5rZXIuYmlhcyA9IDA7XHJcblx0XHRcdFx0cmFua2VyLnBvaW50cyA9IDA7XHJcblx0XHRcdFx0cmFua2VyLnBvd2VyID0gMDtcclxuXHRcdFx0XHRyYW5rZXIucHVzaEhpc3RvcnkoJ01VTFRJJywgeyBjdXJyZW50VGltZSwgb2xkUmFuazogMCB9KTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdWSU5FR0FSJzoge1xyXG5cdFx0XHRcdGxldCB2aW5lZ2FyVGhyb3duID0gK2V2ZW50LmRhdGEuYW1vdW50O1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLnZpbmVnYXIgPSAwO1xyXG5cdFx0XHRcdGxldCB0YXJnZXQgPSB0aGlzLnN0YXRlLmZpcnN0UmFua2VyO1xyXG5cdFx0XHRcdGlmICh0YXJnZXQueW91KSB7XHJcblx0XHRcdFx0XHRpZiAoZXZlbnQuZGF0YS5zdWNjZXNzKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc3RhdGUudmluZWdhcmVkID0ge1xyXG5cdFx0XHRcdFx0XHRcdGp1c3RWaW5lZ2FyZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0dmluZWdhcmVkQnk6IHJhbmtlcixcclxuXHRcdFx0XHRcdFx0XHR2aW5lZ2FyVGhyb3duLFxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0XHQvLyBhbGVydChyYW5rZXIudXNlcm5hbWUgKyBcIiB0aHJldyB0aGVpciBcIlxyXG5cdFx0XHRcdFx0XHQvLyArIG51bWJlckZvcm1hdHRlci5mb3JtYXQodmluZWdhclRocm93bilcclxuXHRcdFx0XHRcdFx0Ly8gKyBcIiBWaW5lZ2FyIGF0IHlvdSBhbmQgbWFkZSB5b3Ugc2xpcCB0byB0aGUgYm90dG9tIG9mIHRoZSBsYWRkZXIuXCIpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0YXJnZXQudmluZWdhciA9IE1hdGgubWF4KDAsIHRhcmdldC52aW5lZ2FyIC0gdmluZWdhclRocm93bik7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnU09GVF9SRVNFVF9QT0lOVFMnOiB7XHJcblx0XHRcdFx0bGV0IHJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbZXZlbnQuYWNjb3VudElkXTtcclxuXHRcdFx0XHRyYW5rZXIucG9pbnRzID0gMDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdQUk9NT1RFJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2V2ZW50LmFjY291bnRJZF07XHJcblx0XHRcdFx0cmFua2VyLmdyb3dpbmcgPSBmYWxzZTtcclxuXHJcblx0XHRcdFx0aWYgKGV2ZW50LmFjY291bnRJZCA9PSB0aGlzLnVzZXJEYXRhLmFjY291bnRJZCkge1xyXG5cdFx0XHRcdFx0Ly8gbGV0IG5ld0xhZGRlck51bSA9IGxhZGRlckRhdGEuY3VycmVudExhZGRlci5udW1iZXIgKyAxXHJcblx0XHRcdFx0XHQvLyBjaGFuZ2VMYWRkZXIobmV3TGFkZGVyTnVtKTtcclxuXHRcdFx0XHRcdC8vIGNoYW5nZUNoYXRSb29tKG5ld0xhZGRlck51bSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNhc2UgJ0FVVE9fUFJPTU9URSc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci5ncmFwZXMgLT0gdGhpcy5nZXRBdXRvUHJvbW90ZUdyYXBlQ29zdChyYW5rZXIucmFuayk7XHJcblx0XHRcdFx0cmFua2VyLmF1dG9Qcm9tb3RlID0gdHJ1ZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdKT0lOJzoge1xyXG5cdFx0XHRcdGxldCByYW5rZXIgPSBuZXcgUmFua2VyKCk7XHJcblx0XHRcdFx0cmFua2VyLmFjY291bnRJZCA9IGV2ZW50LmFjY291bnRJZDtcclxuXHRcdFx0XHRyYW5rZXIudXNlcm5hbWUgPSB1bmVzY2FwZUh0bWwoZXZlbnQuZGF0YS51c2VybmFtZSk7XHJcblx0XHRcdFx0aWYgKHJhbmtlci51c2VybmFtZS5pbmNsdWRlcygnXFxcXHUnKSkge1xyXG5cdFx0XHRcdFx0dHJ5IHsgcmFua2VyLnVzZXJuYW1lID0gSlNPTi5wYXJzZShgXCIke3Jhbmtlci51c2VybmFtZX1cImApIH0gY2F0Y2ggeyB9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJhbmtlci5yYW5rID0gdGhpcy5zdGF0ZS5yYW5rZXJzLmxlbmd0aCArIDE7XHJcblx0XHRcdFx0aWYgKCF0aGlzLnN0YXRlLnJhbmtlcnMuZmluZChlID0+IGUuYWNjb3VudElkID09IGV2ZW50LmFjY291bnRJZCkpIHtcclxuXHRcdFx0XHRcdHRoaXMuc3RhdGUucmFua2Vycy5wdXNoKHJhbmtlcik7XHJcblx0XHRcdFx0XHR0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW3Jhbmtlci5hY2NvdW50SWRdID0gcmFua2VyO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdOQU1FX0NIQU5HRSc6IHtcclxuXHRcdFx0XHRsZXQgcmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFtldmVudC5hY2NvdW50SWRdO1xyXG5cdFx0XHRcdHJhbmtlci51c2VybmFtZSA9IHVuZXNjYXBlSHRtbChldmVudC5kYXRhKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdSRVNFVCc6IHtcclxuXHRcdFx0XHQvLyBkaXNjb25uZWN0IGlzIG1hZGUgYXV0b21hdGljYWxseVxyXG5cdFx0XHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRoYW5kbGVJbmZvKG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3VzZXIvcXVldWUvaW5mbyddKSB7XHJcblx0XHR0aGlzLnN0YXRlLmluZm9EYXRhID0ge1xyXG5cdFx0XHRhc3Nob2xlTGFkZGVyOiBtZXNzYWdlLmNvbnRlbnQuYXNzaG9sZUxhZGRlcixcclxuXHRcdFx0YXNzaG9sZVRhZ3M6IG1lc3NhZ2UuY29udGVudC5hc3Nob2xlVGFncy5tYXAodW5lc2NhcGVIdG1sKSxcclxuXHRcdFx0YXV0b1Byb21vdGVMYWRkZXI6IG1lc3NhZ2UuY29udGVudC5hdXRvUHJvbW90ZUxhZGRlcixcclxuXHRcdFx0YmFzZUdyYXBlc05lZWRlZFRvQXV0b1Byb21vdGU6ICttZXNzYWdlLmNvbnRlbnQuYmFzZUdyYXBlc05lZWRlZFRvQXV0b1Byb21vdGUsXHJcblx0XHRcdGJhc2VWaW5lZ2FyTmVlZGVkVG9UaHJvdzogK21lc3NhZ2UuY29udGVudC5iYXNlVmluZWdhck5lZWRlZFRvVGhyb3csXHJcblx0XHRcdG1hbnVhbFByb21vdGVXYWl0VGltZTogbWVzc2FnZS5jb250ZW50Lm1hbnVhbFByb21vdGVXYWl0VGltZSxcclxuXHRcdFx0bWluaW11bVBlb3BsZUZvclByb21vdGU6IG1lc3NhZ2UuY29udGVudC5taW5pbXVtUGVvcGxlRm9yUHJvbW90ZSxcclxuXHRcdFx0cG9pbnRzRm9yUHJvbW90ZTogK21lc3NhZ2UuY29udGVudC5wb2ludHNGb3JQcm9tb3RlLFxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aGFuZGxlUHJpdmF0ZUxhZGRlclVwZGF0ZXMobWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdXNlci9xdWV1ZS9sYWRkZXIvdXBkYXRlcyddKSB7XHJcblx0XHRmb3IgKGxldCBldmVudCBvZiBtZXNzYWdlLmV2ZW50cykge1xyXG5cdFx0XHR0aGlzLmhhbmRsZUV2ZW50KGV2ZW50KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGhhbmRsZUxhZGRlckluaXQobWVzc2FnZTogRmFpclNvY2tldFN1YnNjcmliZVJlc3BvbnNlTWFwWycvdXNlci9xdWV1ZS9sYWRkZXIvJ10pIHtcclxuXHRcdGlmIChtZXNzYWdlLnN0YXR1cyA9PT0gXCJPS1wiKSB7XHJcblx0XHRcdGlmIChtZXNzYWdlLmNvbnRlbnQpIHtcclxuXHRcdFx0XHRsb2NhbFN0b3JhZ2UuX2xhZGRlciA9IEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIgPSBtZXNzYWdlLmNvbnRlbnQuY3VycmVudExhZGRlci5udW1iZXI7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS5zdGFydFJhbmsgPSBtZXNzYWdlLmNvbnRlbnQuc3RhcnRSYW5rO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUucmFua2VycyA9IG1lc3NhZ2UuY29udGVudC5yYW5rZXJzLm1hcChlID0+IFJhbmtlci5mcm9tKGUpKTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLnJhbmtlcnNCeUlkID0gT2JqZWN0LmZyb21FbnRyaWVzKHRoaXMuc3RhdGUucmFua2Vycy5tYXAoZSA9PiBbZS5hY2NvdW50SWQsIGVdKSk7XHJcblx0XHRcdFx0dGhpcy5zdGF0ZS55b3VyUmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzQnlJZFttZXNzYWdlLmNvbnRlbnQueW91clJhbmtlci5hY2NvdW50SWRdIGFzIFlvdVJhbmtlcjtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLmZpcnN0UmFua2VyID0gdGhpcy5zdGF0ZS5yYW5rZXJzWzBdO1xyXG5cclxuXHRcdFx0XHR0aGlzLnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLnN0YXRlLmNvbm5lY3RlZCA9IHRydWU7XHJcblxyXG5cdFx0XHRcdHRoaXMudXNlckRhdGEuYWNjb3VudElkID0gdGhpcy5zdGF0ZS55b3VyUmFua2VyLmFjY291bnRJZDtcclxuXHRcdFx0XHR0aGlzLnVzZXJEYXRhLnVzZXJuYW1lID0gdGhpcy5zdGF0ZS55b3VyUmFua2VyLnVzZXJuYW1lO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRjYWxjdWxhdGVMYWRkZXIoc2Vjb25kc1Bhc3NlZDogbnVtYmVyKSB7XHJcblx0XHR0aGlzLnN0YXRlLmN1cnJlbnRUaW1lICs9IHNlY29uZHNQYXNzZWQ7XHJcblx0XHRsZXQgY3VycmVudFRpbWUgPSB0aGlzLnN0YXRlLmN1cnJlbnRUaW1lO1xyXG5cdFx0Ly8gRklYTUUgdGhpcyB1c2VzIDQwMG1zIHBlciA4ayByYW5rZXJzXHJcblx0XHR0aGlzLnN0YXRlLnJhbmtlcnMuc29ydCgoYSwgYikgPT4gYi5wb2ludHMgLSBhLnBvaW50cyk7XHJcblxyXG5cdFx0bGV0IGxhZGRlclN0YXRzID0ge1xyXG5cdFx0XHRncm93aW5nUmFua2VyQ291bnQ6IDAsXHJcblx0XHRcdHBvaW50c05lZWRlZEZvck1hbnVhbFByb21vdGU6IDAsXHJcblx0XHRcdGV0YTogMFxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuc3RhdGUucmFua2Vycy5mb3JFYWNoKChyYW5rZXIsIGluZGV4KSA9PiB7XHJcblx0XHRcdGxldCByYW5rID0gaW5kZXggKyAxO1xyXG5cdFx0XHRyYW5rZXIucmFuayA9IHJhbms7XHJcblx0XHRcdC8vIElmIHRoZSByYW5rZXIgaXMgY3VycmVudGx5IHN0aWxsIG9uIGxhZGRlclxyXG5cdFx0XHRpZiAoIXJhbmtlci5ncm93aW5nKSByZXR1cm47XHJcblx0XHRcdGxhZGRlclN0YXRzLmdyb3dpbmdSYW5rZXJDb3VudCArPSAxO1xyXG5cclxuXHRcdFx0Ly8gQ2FsY3VsYXRpbmcgUG9pbnRzICYgUG93ZXJcclxuXHRcdFx0aWYgKHJhbmsgIT0gMSkge1xyXG5cdFx0XHRcdHJhbmtlci5wb3dlciArPSBNYXRoLmZsb29yKChyYW5rZXIuYmlhcyArIHJhbmsgLSAxKSAqIHJhbmtlci5tdWx0aXBsaWVyICogc2Vjb25kc1Bhc3NlZCk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmFua2VyLnBvaW50cyArPSBNYXRoLmZsb29yKHJhbmtlci5wb3dlciAqIHNlY29uZHNQYXNzZWQpO1xyXG5cclxuXHJcblx0XHRcdC8vIENhbGN1bGF0aW5nIFZpbmVnYXIgYmFzZWQgb24gR3JhcGVzIGNvdW50XHJcblx0XHRcdGlmIChyYW5rID09IDEpIHtcclxuXHRcdFx0XHRpZiAodGhpcy5zdGF0ZS5jdXJyZW50TGFkZGVyLm51bWJlciA9PT0gMSlcclxuXHRcdFx0XHRcdHJhbmtlci52aW5lZ2FyID0gTWF0aC5mbG9vcihyYW5rZXIudmluZWdhciAqICgwLjk5NzUgKiogc2Vjb25kc1Bhc3NlZCkpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHJhbmtlci52aW5lZ2FyICs9IE1hdGguZmxvb3IocmFua2VyLmdyYXBlcyAqIHNlY29uZHNQYXNzZWQpXHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGxldCByYW5rZXJzT2xkID0gdGhpcy5zdGF0ZS5yYW5rZXJzLnNsaWNlKCk7XHJcblx0XHQvLyBGSVhNRSB0aGlzIHVzZXMgNDAwbXMgcGVyIDhrIHJhbmtlcnNcclxuXHRcdHRoaXMuc3RhdGUucmFua2Vycy5zb3J0KChhLCBiKSA9PiBiLnBvaW50cyAtIGEucG9pbnRzKTtcclxuXHJcblx0XHR0aGlzLnN0YXRlLnJhbmtlcnMuZm9yRWFjaCgocmFua2VyLCBpbmRleCwgbGlzdCkgPT4ge1xyXG5cdFx0XHRsZXQgbmV3UmFuayA9IGluZGV4ICsgMTtcclxuXHRcdFx0bGV0IG9sZFJhbmsgPSByYW5rZXIucmFuaztcclxuXHRcdFx0aWYgKG5ld1JhbmsgPT0gb2xkUmFuaykgcmV0dXJuO1xyXG5cclxuXHRcdFx0cmFua2VyLnJhbmsgPSBuZXdSYW5rO1xyXG5cclxuXHRcdFx0aWYgKG5ld1JhbmsgPCBvbGRSYW5rKVxyXG5cdFx0XHRcdHJhbmtlci5wdXNoSGlzdG9yeSgnVVBSQU5LJywgeyBjdXJyZW50VGltZSwgb2xkUmFuayB9KTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHJhbmtlci5wdXNoSGlzdG9yeSgnRE9XTlJBTksnLCB7IGN1cnJlbnRUaW1lLCBvbGRSYW5rIH0pO1xyXG5cclxuXHRcdFx0aWYgKG5ld1JhbmsgPCBvbGRSYW5rKSB7XHJcblx0XHRcdFx0Ly8gcmFuayBpbmNyZWFzZSwgZ2FpbiBncmFwZXNcclxuXHRcdFx0XHRmb3IgKGxldCByID0gb2xkUmFuazsgciA8IG5ld1Jhbms7IHIrKykge1xyXG5cdFx0XHRcdFx0Ly8gbGV0IG90aGVyUmFua2VyID0gcmFua2Vyc09sZFtyXTtcclxuXHRcdFx0XHRcdGlmIChyYW5rZXIuZ3Jvd2luZyAmJiAocmFua2VyLmJpYXMgPiAwIHx8IHJhbmtlci5tdWx0aXBsaWVyID4gMSkpIHtcclxuXHRcdFx0XHRcdFx0cmFua2VyLmdyYXBlcysrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFJhbmtlciBvbiBMYXN0IFBsYWNlIGdhaW5zIDEgR3JhcGUsIG9ubHkgaWYgaGUgaXNuJ3QgdGhlIG9ubHkgb25lXHJcblx0XHRpZiAodGhpcy5zdGF0ZS5yYW5rZXJzLmxlbmd0aCA+PSBNYXRoLm1heCh0aGlzLnN0YXRlLmluZm9EYXRhLm1pbmltdW1QZW9wbGVGb3JQcm9tb3RlLCB0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyKSkge1xyXG5cdFx0XHRsZXQgbGFzdFJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc1t0aGlzLnN0YXRlLnJhbmtlcnMubGVuZ3RoIC0gMV07XHJcblx0XHRcdGlmIChsYXN0UmFua2VyLmdyb3dpbmcpIHtcclxuXHRcdFx0XHRsYXN0UmFua2VyLmdyYXBlcyArPSB+fnNlY29uZHNQYXNzZWQ7XHJcblx0XHRcdFx0bGFzdFJhbmtlci5wdXNoSGlzdG9yeSgnTEFTVCcsIHsgY3VycmVudFRpbWUsIG9sZFJhbms6IDAgfSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHRoaXMuc3RhdGUuZmlyc3RSYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNbMF07XHJcblxyXG5cdFx0dGhpcy5jYWxjdWxhdGVTdGF0cygpO1xyXG5cdH1cclxuXHJcblx0Y2FsY3VsYXRlU3RhdHMoKSB7XHJcblx0XHR0aGlzLnN0YXRlLnBvaW50c05lZWRlZEZvck1hbnVhbFByb21vdGUgPSB0aGlzLmNhbGN1bGF0ZVBvaW50c05lZWRlZEZvck1hbnVhbFByb21vdGUoKTtcclxuXHRcdC8vIFx0Ly8gRVRBXHJcblx0XHQvLyBcdC8vIFRPRE86IEVUQVxyXG5cdH1cclxuXHRjYWxjdWxhdGVQb2ludHNOZWVkZWRGb3JNYW51YWxQcm9tb3RlKCkge1xyXG5cdFx0bGV0IGluZm9EYXRhID0gdGhpcy5zdGF0ZS5pbmZvRGF0YTtcclxuXHRcdGlmICh0aGlzLnN0YXRlLnJhbmtlcnMubGVuZ3RoIDwgTWF0aC5tYXgoaW5mb0RhdGEubWluaW11bVBlb3BsZUZvclByb21vdGUsIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIpKSB7XHJcblx0XHRcdHJldHVybiBJbmZpbml0eTtcclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLnN0YXRlLmZpcnN0UmFua2VyLnBvaW50cyA8IGluZm9EYXRhLnBvaW50c0ZvclByb21vdGUpIHtcclxuXHRcdFx0cmV0dXJuIGluZm9EYXRhLnBvaW50c0ZvclByb21vdGU7XHJcblx0XHR9XHJcblx0XHRsZXQgZmlyc3RSYW5rZXIgPSB0aGlzLnN0YXRlLmZpcnN0UmFua2VyO1xyXG5cdFx0bGV0IHNlY29uZFJhbmtlciA9IHRoaXMuc3RhdGUucmFua2Vyc1sxXTtcclxuXHRcdGlmICh0aGlzLnN0YXRlLmN1cnJlbnRMYWRkZXIubnVtYmVyIDwgaW5mb0RhdGEuYXV0b1Byb21vdGVMYWRkZXIpIHtcclxuXHRcdFx0aWYgKCFmaXJzdFJhbmtlci55b3UpIHJldHVybiBmaXJzdFJhbmtlci5wb2ludHMgKyAxO1xyXG5cdFx0XHRyZXR1cm4gc2Vjb25kUmFua2VyLnBvaW50cyArIDE7XHJcblx0XHR9XHJcblxyXG5cdFx0bGV0IGxlYWRpbmdSYW5rZXIgPSBmaXJzdFJhbmtlcjtcclxuXHRcdGxldCBwdXJzdWluZ1JhbmtlciA9IGZpcnN0UmFua2VyLnlvdSA/IHNlY29uZFJhbmtlciA6IGZpcnN0UmFua2VyO1xyXG5cclxuXHRcdC8vIEhvdyBtYW55IG1vcmUgcG9pbnRzIGRvZXMgdGhlIHJhbmtlciBnYWluIGFnYWluc3QgaGlzIHB1cnN1ZXIsIGV2ZXJ5IFNlY29uZFxyXG5cdFx0bGV0IHBvd2VyRGlmZiA9IChsZWFkaW5nUmFua2VyLmdyb3dpbmcgPyBwdXJzdWluZ1Jhbmtlci5wb3dlciA6IDApIC0gKHB1cnN1aW5nUmFua2VyLmdyb3dpbmcgPyBwdXJzdWluZ1Jhbmtlci5wb3dlciA6IDApO1xyXG5cdFx0Ly8gQ2FsY3VsYXRlIHRoZSBuZWVkZWQgUG9pbnQgZGlmZmVyZW5jZSwgdG8gaGF2ZSBmLmUuIDMwc2Vjb25kcyBvZiBwb2ludCBnZW5lcmF0aW9uIHdpdGggdGhlIGRpZmZlcmVuY2UgaW4gcG93ZXJcclxuXHRcdGxldCBuZWVkZWRQb2ludERpZmYgPSBNYXRoLmFicyhwb3dlckRpZmYgKiBpbmZvRGF0YS5tYW51YWxQcm9tb3RlV2FpdFRpbWUpO1xyXG5cclxuXHRcdHJldHVybiBNYXRoLm1heChcclxuXHRcdFx0KGxlYWRpbmdSYW5rZXIueW91ID8gcHVyc3VpbmdSYW5rZXIgOiBsZWFkaW5nUmFua2VyKS5wb2ludHMgKyBuZWVkZWRQb2ludERpZmYsXHJcblx0XHRcdGluZm9EYXRhLnBvaW50c0ZvclByb21vdGVcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHJcblx0cmVxdWVzdCh0eXBlOiAnYXNzaG9sZScgfCAnYXV0by1wcm9tb3RlJyB8ICdiaWFzJyB8ICdtdWx0aScgfCAncHJvbW90ZScgfCAndmluZWdhcicpIHtcclxuXHRcdGlmICghdGhpcy5zb2NrZXQpIHRocm93IDA7XHJcblx0XHRpZiAoIXRoaXMuY2FuUmVxdWVzdCh0eXBlLCB0aGlzLnN0YXRlLnlvdXJSYW5rZXIuYWNjb3VudElkKSkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgZmFrZVJlcXVlc3Q6ICVPIGNhbid0IGRvICVPIWAsIFZ1ZS50b1Jhdyh0aGlzLnN0YXRlLnlvdXJSYW5rZXIpLCB0eXBlKTtcclxuXHRcdH1cclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoYC9hcHAvbGFkZGVyL3Bvc3QvJHt0eXBlfWAsIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pO1xyXG5cdH1cclxuXHJcblx0ZmFrZVVwZGF0ZShzZWNvbmRzUGFzc2VkOiBudW1iZXIgPSAxKSB7XHJcblx0XHR0aGlzLmNhbGN1bGF0ZUxhZGRlcihzZWNvbmRzUGFzc2VkKTtcclxuXHR9XHJcblx0ZmFrZVJlcXVlc3QoZXZlbnRUeXBlOiBTb2NrZXRMYWRkZXJFdmVudFsnZXZlbnRUeXBlJ10sIGFjY291bnRJZDogYWNjb3VudElkID0gdGhpcy5zdGF0ZS55b3VyUmFua2VyLmFjY291bnRJZCkge1xyXG5cdFx0aWYgKCF0aGlzLmNhblJlcXVlc3QoZXZlbnRUeXBlLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXy9nLCAnLScpIGFzIGFueSwgYWNjb3VudElkKSkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgZmFrZVJlcXVlc3Q6ICVPIGNhbid0IGRvICVPIWAsIFZ1ZS50b1Jhdyh0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2FjY291bnRJZF0pLCBldmVudFR5cGUpO1xyXG5cdFx0fVxyXG5cdFx0c3dpdGNoIChldmVudFR5cGUpIHtcclxuXHRcdFx0Y2FzZSAnQklBUyc6XHJcblx0XHRcdGNhc2UgJ01VTFRJJzpcclxuXHRcdFx0Y2FzZSAnU09GVF9SRVNFVF9QT0lOVFMnOlxyXG5cdFx0XHRjYXNlICdQUk9NT1RFJzpcclxuXHRcdFx0Y2FzZSAnQVVUT19QUk9NT1RFJzpcclxuXHRcdFx0XHR0aGlzLmhhbmRsZUV2ZW50KHsgZXZlbnRUeXBlLCBhY2NvdW50SWQgfSk7IGJyZWFrO1xyXG5cdFx0XHRjYXNlICdWSU5FR0FSJzoge1xyXG5cdFx0XHRcdGxldCB0YXJnZXQgPSB0aGlzLnN0YXRlLnJhbmtlcnNbMF07XHJcblx0XHRcdFx0bGV0IHNvdXJjZSA9IHRoaXMuc3RhdGUucmFua2Vyc0J5SWRbYWNjb3VudElkXTtcclxuXHRcdFx0XHR0aGlzLmhhbmRsZUV2ZW50KHtcclxuXHRcdFx0XHRcdGV2ZW50VHlwZSwgYWNjb3VudElkLCBkYXRhOiB7XHJcblx0XHRcdFx0XHRcdGFtb3VudDogc291cmNlLnZpbmVnYXIgKyAnJyxcclxuXHRcdFx0XHRcdFx0c3VjY2Vzczogc291cmNlLnZpbmVnYXIgPiB0YXJnZXQudmluZWdhcixcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTsgYnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRldmVudFR5cGU7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcignbm90IGltcGxlbWVudGVkJywgeyBmYWtlUmVxdWVzdDogdHJ1ZSwgZXZlbnRUeXBlLCBhY2NvdW50SWQgfSk7XHJcblx0XHRcdFx0YWxlcnQoJ25vdCBpbXBsZW1lbnRlZCcpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5jYWxjdWxhdGVMYWRkZXIoMCk7XHJcblx0fVxyXG5cclxuXHJcblxyXG5cdGdldFVwZ3JhZGVDb3N0KGxldmVsOiBudW1iZXIpIHtcclxuXHRcdHJldHVybiBNYXRoLnJvdW5kKE1hdGgucG93KHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIgKyAxLCBsZXZlbCkpO1xyXG5cdH1cclxuXHJcblx0Z2V0VmluZWdhclRocm93Q29zdCgpIHtcclxuXHRcdHJldHVybiB0aGlzLnN0YXRlLmluZm9EYXRhLmJhc2VWaW5lZ2FyTmVlZGVkVG9UaHJvdyAqIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXI7XHJcblx0fVxyXG5cclxuXHRnZXRBdXRvUHJvbW90ZUdyYXBlQ29zdChyYW5rOiBudW1iZXIpIHtcclxuXHRcdGxldCBpbmZvRGF0YSA9IHRoaXMuc3RhdGUuaW5mb0RhdGE7XHJcblx0XHRsZXQgbWluUGVvcGxlID0gTWF0aC5tYXgoaW5mb0RhdGEubWluaW11bVBlb3BsZUZvclByb21vdGUsIHRoaXMuc3RhdGUuY3VycmVudExhZGRlci5udW1iZXIpO1xyXG5cdFx0bGV0IGRpdmlzb3IgPSBNYXRoLm1heChyYW5rIC0gbWluUGVvcGxlICsgMSwgMSk7XHJcblx0XHRyZXR1cm4gTWF0aC5mbG9vcihpbmZvRGF0YS5iYXNlR3JhcGVzTmVlZGVkVG9BdXRvUHJvbW90ZSAvIGRpdmlzb3IpO1xyXG5cdH1cclxuXHJcblx0Z2V0Qmlhc0Nvc3QocmFua2VyOiBSYW5rZXIgPSB0aGlzLnN0YXRlLnlvdXJSYW5rZXIpIHtcclxuXHRcdHJldHVybiB0aGlzLmdldFVwZ3JhZGVDb3N0KHJhbmtlci5iaWFzICsgMSk7XHJcblx0fVxyXG5cdGdldE11bHRpcGxpZXJDb3N0KHJhbmtlcjogUmFua2VyID0gdGhpcy5zdGF0ZS55b3VyUmFua2VyKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5nZXRVcGdyYWRlQ29zdChyYW5rZXIubXVsdGlwbGllciArIDEpO1xyXG5cdH1cclxuXHJcblx0Y2FuUmVxdWVzdCh0eXBlOiAnYXNzaG9sZScgfCAnYXV0by1wcm9tb3RlJyB8ICdiaWFzJyB8ICdtdWx0aScgfCAncHJvbW90ZScgfCAndmluZWdhcicsIGFjY291bnRJZCA9IHRoaXMuc3RhdGUueW91clJhbmtlci5hY2NvdW50SWQpIHtcclxuXHRcdGxldCByYW5rZXIgPSB0aGlzLnN0YXRlLnJhbmtlcnNCeUlkW2FjY291bnRJZF07XHJcblx0XHRzd2l0Y2ggKHR5cGUpIHtcclxuXHRcdFx0Y2FzZSAnYmlhcyc6IHtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRCaWFzQ29zdChyYW5rZXIpIDw9IHJhbmtlci5wb2ludHM7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnbXVsdGknOiB7XHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0TXVsdGlwbGllckNvc3QocmFua2VyKSA8PSByYW5rZXIucG93ZXI7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAndmluZWdhcic6IHtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXRWaW5lZ2FyVGhyb3dDb3N0KCkgPD0gcmFua2VyLnZpbmVnYXI7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAncHJvbW90ZSc6IHtcclxuXHRcdFx0XHRyZXR1cm4gISEnVE9ETyc7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2FzZSAnYXV0by1wcm9tb3RlJzoge1xyXG5cdFx0XHRcdHJldHVybiAhISdUT0RPJztcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXNlICdhc3Nob2xlJzoge1xyXG5cdFx0XHRcdHJldHVybiAhISdUT0RPJztcclxuXHRcdFx0fVxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG59XHJcblxyXG5AR2xvYmFsQ29tcG9uZW50XHJcbmNsYXNzIEZhaXJMYWRkZXJWdWUgZXh0ZW5kcyBWdWVXaXRoUHJvcHMoe1xyXG5cdGxhZGRlcjogRmFpckxhZGRlcixcclxufSkge1xyXG5cdEBWdWVUZW1wbGF0ZVxyXG5cdGdldCBfdCgpIHtcclxuXHRcdGxldCByZWNvcmQgPSB0aGlzLnRhYmxlRGF0YVswXTtcclxuXHRcdGxldCByYW5rZXIgPSB0aGlzLnRhYmxlRGF0YVswXTtcclxuXHRcdGxldCBoID0gdGhpcy5nZXRIaXN0b3J5KHJhbmtlcilbMF07XHJcblx0XHRyZXR1cm4gYFxyXG5cdFx0XHQ8TEFEREVSPlxyXG5cdFx0XHRcdDxhLXRhYmxlXHJcblx0XHRcdFx0XHRcdDpjb2x1bW5zPVwiY29sdW1uc1wiXHJcblx0XHRcdFx0XHRcdDpkYXRhLXNvdXJjZT1cInRhYmxlRGF0YVwiXHJcblx0XHRcdFx0XHRcdHNpemU9XCJzbWFsbFwiXHJcblx0XHRcdFx0XHRcdDpyb3dLZXk9XCIocmVjb3JkKSA9PiByZWNvcmQuYWNjb3VudElkXCJcclxuXHRcdFx0XHRcdFx0OnJvd0NsYXNzTmFtZT1cIihyZWNvcmQsIGluZGV4KT0+cm93Q2xhc3NOYW1lKHJlY29yZClcIlxyXG5cdFx0XHRcdFx0XHQ6cGFnaW5hdGlvbj1cInBhZ2luYXRpb25cIlxyXG5cdFx0XHRcdFx0XHR4LXRhYmxlTGF5b3V0PVwiZml4ZWRcIlxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI2hlYWRlckNlbGw9XCJ7IGNvbHVtbiwgdGV4dCB9XCI+XHJcblx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSB2LWlmPVwiY29sdW1uLmtleSA9PSAndXNlcm5hbWUnXCI+XHJcblx0XHRcdFx0XHRcdFx0PGIgc3R5bGU9XCJ3aWR0aDogMWVtO2Rpc3BsYXk6aW5saW5lLWZsZXg7XCI+XHJcblx0XHRcdFx0XHRcdFx0PC9iPlVzZXJuYW1lXHJcblx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNib2R5Q2VsbD1cInsgdGV4dCwgcmVjb3JkOiByYW5rZXIsIGluZGV4LCBjb2x1bW4gfVwiPlxyXG5cdFx0XHRcdFx0XHQ8dGVtcGxhdGUgdi1pZj1cImNvbHVtbi5rZXkgPT0gJ3JhbmsnXCI+XHJcblx0XHRcdFx0XHRcdFx0PHNwYW4gc3R5bGU9XCJvcGFjaXR5OiAwLjI7XCI+e3snMDAwMCcuc2xpY2UoKHRleHQrJycpLmxlbmd0aCl9fTwvc3Bhbj57e3RleHR9fVxyXG5cdFx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0XHQ8dGVtcGxhdGUgdi1pZj1cImNvbHVtbi5rZXkgPT0gJ3VzZXJuYW1lJ1wiPlxyXG5cdFx0XHRcdFx0XHRcdDxhLXRvb2x0aXBcclxuXHRcdFx0XHRcdFx0XHRcdFx0cGxhY2VtZW50PVwiYm90dG9tTGVmdFwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdD5cclxuXHRcdFx0XHRcdFx0XHRcdDxiIHN0eWxlPVwid2lkdGg6IDFlbTtkaXNwbGF5OmlubGluZS1mbGV4O2p1c3RpZnktY29udGVudDogY2VudGVyO1wiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0OnN0eWxlPVwie29wYWNpdHk6cmFua2VyLnRpbWVzQXNzaG9sZT8xOjAuMX1cIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0eyR7dGhpcy5hc3Nob2xlVGFnKHJhbmtlcikgfHwgJ0AnfX1cclxuXHRcdFx0XHRcdFx0XHRcdDwvYj57e3RleHR9fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjdGl0bGU+XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxkaXYgdi1pZj1cInJhbmtlci50aW1lc0Fzc2hvbGVcIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRQcmVzc2VkIEFzc2hvbGUgQnV0dG9uIHt7cmFua2VyLnRpbWVzQXNzaG9sZX19IHRpbWVzXHJcblx0XHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8ZGl2IHYtaWY9XCIhcmFua2VyLmdyb3dpbmdcIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRQcm9tb3RlZFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0aWQ6e3tyYW5rZXIuYWNjb3VudElkfX1cclxuXHRcdFx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0PC9hLXRvb2x0aXA+XHJcblx0XHRcdFx0XHRcdFx0PGRpdiBzdHlsZT1cImZsb2F0OiByaWdodDtcIiB2LWlmPVwiMVwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGIgdi1mb3I9XCIke2h9IG9mICR7dGhpcy5nZXRIaXN0b3J5KHJhbmtlcil9XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0c3R5bGU9XCJkaXNwbGF5OiBpbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpyaWdodDtcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHQ6c3R5bGU9XCJoLnN0eWxlXCJcclxuXHRcdFx0XHRcdFx0XHRcdD57JHtoLnRleHR9fTwvYj5cclxuXHRcdFx0XHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHRcdFx0XHRcclxuXHJcblx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNmb290ZXI+XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHQ8YS1yb3cgdHlwZT1cImZsZXhcIiBzdHlsZT1cImFsaWduLWl0ZW1zOiBjZW50ZXI7XCI+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29sIGZsZXg9XCI5XCIgLz5cclxuXHRcdFx0XHRcdFx0XHQ8YS1jb2wgZmxleD1cIjFcIiBzdHlsZT1cInBhZGRpbmc6IDAgOHB4O1wiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGRpdiBzdHlsZT1cIndoaXRlLXNwYWNlOiBub3dyYXA7XCI+XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNhbjp7JHt0aGlzLmJpYXMuY2FufX1cclxuXHRcdFx0XHRcdFx0XHRcdFx0KHske3RoaXMuYmlhcy5zUG9pbnRzfX0gLyB7JHt0aGlzLmJpYXMuc0Nvc3R9fSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0W3ske3RoaXMuYmlhcy5zVmFsdWV9fV1cclxuXHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29sIGZsZXg9XCIzMCVcIj5cclxuXHRcdFx0XHRcdFx0XHRcdDxhLXByb2dyZXNzIHNpemU9XCJzbWFsbFwiIDpwZXJjZW50PVwiJHt0aGlzLmJpYXMucGVyY2VudH1cIiAvPlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29sIGZsZXg9XCI3MHB4XCI+XHJcblx0XHRcdFx0XHRcdFx0XHQ8YS1idXR0b24gdHlwZT1cInByaW1hcnlcIiBjbGFzcz1cImJ1dHRvbi1ncmVlblwiIDpkaXNhYmxlZD1cIiR7IXRoaXMuYmlhcy5jYW5SZXF1ZXN0fVwiIEBjbGljaz1cIiR7dGhpcy5iaWFzLmRvUmVxdWVzdCgpfVwiIGJsb2NrPlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRCaWFzXHJcblx0XHRcdFx0XHRcdFx0XHQ8L2EtYnV0dG9uPlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0XHRcdDwvYS1yb3c+XHJcblx0XHRcdFx0XHRcdDxhLXJvdyB0eXBlPVwiZmxleFwiIHN0eWxlPVwiYWxpZ24taXRlbXM6IGNlbnRlcjtcIj5cclxuXHRcdFx0XHRcdFx0XHQ8YS1jb2wgZmxleD1cIjlcIiAvPlxyXG5cdFx0XHRcdFx0XHRcdDxhLWNvbCBmbGV4PVwiMVwiIHN0eWxlPVwicGFkZGluZzogMCA4cHg7XCI+XHJcblx0XHRcdFx0XHRcdFx0XHQ8ZGl2IHN0eWxlPVwid2hpdGUtc3BhY2U6IG5vd3JhcDtcIj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0Y2FuOnske3RoaXMubXVsdGkuY2FufX1cclxuXHRcdFx0XHRcdFx0XHRcdFx0KHske3RoaXMubXVsdGkuc1BvaW50c319IC8geyR7dGhpcy5tdWx0aS5zQ29zdH19KVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRbeyR7dGhpcy5tdWx0aS5zVmFsdWV9fV1cclxuXHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29sIGZsZXg9XCIzMCVcIj5cclxuXHRcdFx0XHRcdFx0XHRcdDxhLXByb2dyZXNzIHNpemU9XCJzbWFsbFwiIDpwZXJjZW50PVwiJHt0aGlzLm11bHRpLnBlcmNlbnR9XCIgLz5cclxuXHRcdFx0XHRcdFx0XHQ8L2EtY29sPlxyXG5cdFx0XHRcdFx0XHRcdDxhLWNvbCBmbGV4PVwiNzBweFwiPlxyXG5cdFx0XHRcdFx0XHRcdFx0PGEtYnV0dG9uIHR5cGU9XCJwcmltYXJ5XCIgOmRpc2FibGVkPVwiJHshdGhpcy5tdWx0aS5jYW5SZXF1ZXN0fVwiIEBjbGljaz1cIiR7dGhpcy5tdWx0aS5kb1JlcXVlc3QoKX1cIiBibG9jaz5cclxuXHRcdFx0XHRcdFx0XHRcdFx0TXVsdGlcclxuXHRcdFx0XHRcdFx0XHRcdDwvYS1idXR0b24+XHJcblx0XHRcdFx0XHRcdFx0PC9hLWNvbD5cclxuXHRcdFx0XHRcdFx0PC9hLXJvdz5cclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdDwvYS10YWJsZT5cclxuXHRcdFx0PC9MQURERVI+XHJcblx0XHRgXHJcblx0fVxyXG5cdHBhZ2VTaXplID0gMTU7XHJcblx0Y3VycmVudFBhZ2UgPSAtMTtcclxuXHRnZXQgcGFnaW5hdGlvbigpOiBhbnRkLlRhYmxlUHJvcHM8UmFua2VyPlsncGFnaW5hdGlvbiddIHtcclxuXHRcdGlmICh0aGlzLmN1cnJlbnRQYWdlID09IC0xKSB7XHJcblx0XHRcdHRoaXMuY3VycmVudFBhZ2UgPSBNYXRoLmNlaWwodGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5yYW5rIC8gdGhpcy5wYWdlU2l6ZSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRkZWZhdWx0UGFnZVNpemU6IHRoaXMucGFnZVNpemUsXHJcblx0XHRcdGRlZmF1bHRDdXJyZW50OiB0aGlzLmN1cnJlbnRQYWdlLFxyXG5cdFx0XHQvLyBoaWRlT25TaW5nbGVQYWdlOiB0cnVlLFxyXG5cdFx0XHRwYWdlU2l6ZTogdGhpcy5wYWdlU2l6ZSxcclxuXHRcdFx0c2hvd1NpemVDaGFuZ2VyOiB0cnVlLFxyXG5cdFx0XHRjdXJyZW50OiB0aGlzLmN1cnJlbnRQYWdlLFxyXG5cdFx0XHRvbkNoYW5nZTogKHBhZ2U6IG51bWJlciwgc2l6ZTogbnVtYmVyKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50UGFnZSA9IHBhZ2U7XHJcblx0XHRcdH0sXHJcblx0XHRcdG9uU2hvd1NpemVDaGFuZ2U6IChwYWdlOiBudW1iZXIsIHNpemU6IG51bWJlcikgPT4ge1xyXG5cdFx0XHRcdHRoaXMucGFnZVNpemUgPSBzaXplO1xyXG5cdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50UGFnZSA9IE1hdGguY2VpbCh0aGlzLmxhZGRlci5zdGF0ZS55b3VyUmFua2VyLnJhbmsgLyB0aGlzLnBhZ2VTaXplKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKHtcclxuXHRcdFx0XHRcdFx0cmFuazogdGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5yYW5rLFxyXG5cdFx0XHRcdFx0XHRwYWdlOiB0aGlzLmN1cnJlbnRQYWdlLFxyXG5cdFx0XHRcdFx0XHRzaXplXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRwYWdlU2l6ZU9wdGlvbnM6IEFycmF5KDMwKS5maWxsKDApLm1hcCgoZSwgaSkgPT4gaSArIDEpLnJldmVyc2UoKSxcclxuXHRcdH07XHJcblx0fVxyXG5cdGNvbHVtbnM6IEV4Y2x1ZGU8YW50ZC5UYWJsZVByb3BzPFJhbmtlcj5bJ2NvbHVtbnMnXSwgdW5kZWZpbmVkPiA9IFtcclxuXHRcdHsgdGl0bGU6ICcjJywgZGF0YUluZGV4OiAncmFuaycsIGtleTogJ3JhbmsnLCB3aWR0aDogJ2NhbGMoMTZweCArIDRjaCknLCBhbGlnbjogJ3JpZ2h0JyB9LFxyXG5cdFx0eyB0aXRsZTogJ1VzZXJuYW1lJywgZGF0YUluZGV4OiAndXNlcm5hbWUnLCBrZXk6ICd1c2VybmFtZScgfSxcclxuXHRcdHsgdGl0bGU6ICdQb3dlcicsIGRhdGFJbmRleDogJ3Bvd2VyRm9ybWF0dGVkJywga2V5OiAncG93ZXInLCBhbGlnbjogJ3JpZ2h0Jywgd2lkdGg6ICczMCUnIH0sXHJcblx0XHR7IHRpdGxlOiAnUG9pbnRzJywgZGF0YUluZGV4OiAncG9pbnRzRm9ybWF0dGVkJywga2V5OiAncG9pbnRzJywgYWxpZ246ICdyaWdodCcsIHdpZHRoOiAnMzAlJyB9LFxyXG5cdF07XHJcblx0Y29uc3RydWN0b3IoLi4uYTogYW55W10pIHtcclxuXHRcdHN1cGVyKC4uLmEpO1xyXG5cdFx0dGhpcy5jb2x1bW5zWzFdLmZpbHRlcnMgPSBbXHJcblx0XHRcdHsgdGV4dDogJ0NlbnRlciB5b3Vyc2VsZicsIHZhbHVlOiB0cnVlIH1cclxuXHRcdF07XHJcblx0XHR0aGlzLmNvbHVtbnNbMV0ub25GaWx0ZXIgPSAodmFsdWUsIHJhbmtlcjogUmFua2VyKSA9PiB7XHJcblx0XHRcdGlmICghdmFsdWUpIHJldHVybiB0cnVlO1xyXG5cdFx0XHRpZiAocmFua2VyLnJhbmsgPT0gMSkgcmV0dXJuIHRydWU7XHJcblx0XHRcdHJldHVybiB0aGlzLmNlbnRlcmVkTGltaXRzLm1pbiA8PSByYW5rZXIucmFua1xyXG5cdFx0XHRcdCYmIHJhbmtlci5yYW5rIDw9IHRoaXMuY2VudGVyZWRMaW1pdHMubWF4O1xyXG5cdFx0fVxyXG5cdH1cclxuXHRnZXQgY2VudGVyZWRMaW1pdHMoKSB7XHJcblx0XHRsZXQgc3RhdGUgPSB0aGlzLmxhZGRlci5zdGF0ZTtcclxuXHRcdGxldCBoYWxmID0gfn4odGhpcy5wYWdlU2l6ZSAvIDIpLCBleHRyYSA9IHRoaXMucGFnZVNpemUgJSAyO1xyXG5cdFx0bGV0IG1pZGRsZVJhbmsgPSBzdGF0ZS55b3VyUmFua2VyLnJhbms7XHJcblx0XHRtaWRkbGVSYW5rID0gTWF0aC5taW4obWlkZGxlUmFuaywgc3RhdGUucmFua2Vycy5sZW5ndGggLSBoYWxmKTtcclxuXHRcdG1pZGRsZVJhbmsgPSBNYXRoLm1heChtaWRkbGVSYW5rLCBoYWxmICsgMSk7XHJcblx0XHRyZXR1cm4geyBtaW46IG1pZGRsZVJhbmsgLSBoYWxmICsgMSwgbWF4OiBtaWRkbGVSYW5rICsgaGFsZiAtIDEgKyBleHRyYSB9O1xyXG5cdH1cclxuXHRnZXQgdGFibGVEYXRhKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMubGFkZGVyLnN0YXRlLnJhbmtlcnM7XHJcblx0fVxyXG5cdHJvd0NsYXNzTmFtZShyZWNvcmQ6IFJhbmtlcikge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0J3Jhbmtlci1yb3cteW91JzogcmVjb3JkLnlvdSxcclxuXHRcdFx0J3Jhbmtlci1yb3ctcHJvbW90ZWQnOiAhcmVjb3JkLmdyb3dpbmcsXHJcblx0XHR9O1xyXG5cdH1cclxuXHRhc3Nob2xlVGFnKHJhbmtlcjogUmFua2VyKSB7XHJcblx0XHRsZXQgdGFncyA9IHRoaXMubGFkZGVyLnN0YXRlLmluZm9EYXRhLmFzc2hvbGVUYWdzO1xyXG5cdFx0aWYgKHJhbmtlci50aW1lc0Fzc2hvbGUgPCB0YWdzLmxlbmd0aCkgcmV0dXJuIHRhZ3NbcmFua2VyLnRpbWVzQXNzaG9sZV07XHJcblx0XHRyZXR1cm4gdGFnc1t0YWdzLmxlbmd0aCAtIDFdO1xyXG5cdH1cclxuXHJcblx0Z2V0VmlzaWJsZUV2ZW50cyhyYW5rZXI6IFJhbmtlcikge1xyXG5cdFx0Y29uc3QgdmlzaWJsZUR1cmF0aW9uID0gMTA7XHJcblx0XHRjb25zdCBkaXNhcHBlYXJEdXJhdGlvbiA9IDEwO1xyXG5cdFx0bGV0IG5vdyA9IHRoaXMubGFkZGVyLnN0YXRlLmN1cnJlbnRUaW1lO1xyXG5cdFx0cmV0dXJuIHJhbmtlci5oaXN0b3J5XHJcblx0XHRcdC5tYXAoZSA9PiB7XHJcblx0XHRcdFx0bGV0IHRpbWVTaW5jZSA9IG5vdyAtIGUuY3VycmVudFRpbWU7XHJcblx0XHRcdFx0bGV0IG9wYWNpdHkgPSB0aW1lU2luY2UgPCB2aXNpYmxlRHVyYXRpb24gPyAxIDogKDEgLSAodGltZVNpbmNlIC0gdmlzaWJsZUR1cmF0aW9uKSAvIGRpc2FwcGVhckR1cmF0aW9uKTtcclxuXHRcdFx0XHRyZXR1cm4geyBkZWx0YTogZS5yYW5rIC0gZS5vbGRSYW5rLCBvcGFjaXR5IH07XHJcblx0XHRcdH0pLmZpbHRlcihlID0+IGUub3BhY2l0eSA+IDApXHJcblx0XHRcdC5mbGF0TWFwKGUgPT4ge1xyXG5cdFx0XHRcdHJldHVybiBBcnJheShNYXRoLmFicyhlLmRlbHRhKSkuZmlsbChlKTtcclxuXHRcdFx0fSlcclxuXHRcdFx0LnNsaWNlKC0xMCkucmV2ZXJzZSgpO1xyXG5cdH1cclxuXHRnZXRIaXN0b3J5KHJhbmtlcjogUmFua2VyKSB7XHJcblx0XHQvLyBjb25zb2xlLnRpbWUoKVxyXG5cdFx0Y29uc3QgdmlzaWJsZUR1cmF0aW9uID0gMTA7XHJcblx0XHRjb25zdCBkaXNhcHBlYXJEdXJhdGlvbiA9IDEwO1xyXG5cdFx0bGV0IG5vdyA9IHRoaXMubGFkZGVyLnN0YXRlLmN1cnJlbnRUaW1lO1xyXG5cdFx0Y29uc3QgdGV4dHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHVuZGVmaW5lZD4gPSB7XHJcblx0XHRcdFVQUkFOSzogJ+KWsicsXHJcblx0XHRcdERPV05SQU5LOiAn4pa8JyxcclxuXHRcdFx0TEFTVDogJ/CfpZ0nLFxyXG5cdFx0XHRCSUFTOiAnIEIgJyxcclxuXHRcdFx0TVVMVEk6ICcgTSAnLFxyXG5cdFx0fTtcclxuXHRcdGNvbnN0IHN0eWxlTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCB1bmRlZmluZWQ+ID0ge1xyXG5cdFx0XHRVUFJBTks6ICdjb2xvcjpncmVlbjt3aWR0aDoxY2g7JyxcclxuXHRcdFx0RE9XTlJBTks6ICdjb2xvcjpyZWQ7d2lkdGg6MWNoOycsXHJcblx0XHRcdExBU1Q6ICd3aWR0aDoxY2g7JyxcclxuXHRcdFx0QklBUzogJ2NvbG9yOmJsdWU7d2lkdGg6MmNoOycsXHJcblx0XHRcdE1VTFRJOiAnY29sb3I6cHVycGxlO3dpZHRoOjJjaDsnLFxyXG5cdFx0fTtcclxuXHRcdGxldCB2ID0gVnVlLnRvUmF3KHJhbmtlci5oaXN0b3J5KS5zbGljZSgwLCAxMClcclxuXHRcdFx0LmZsYXRNYXAoZSA9PiB7XHJcblx0XHRcdFx0bGV0IHRpbWVTaW5jZSA9IG5vdyAtIGUuY3VycmVudFRpbWU7XHJcblx0XHRcdFx0bGV0IG9wYWNpdHkgPSB0aW1lU2luY2UgPCB2aXNpYmxlRHVyYXRpb24gPyAxIDogKDEgLSAodGltZVNpbmNlIC0gdmlzaWJsZUR1cmF0aW9uKSAvIGRpc2FwcGVhckR1cmF0aW9uKTtcclxuXHRcdFx0XHRpZiAob3BhY2l0eSA8PSAwKSByZXR1cm4gW11cclxuXHJcblx0XHRcdFx0bGV0IHRleHQgPSB0ZXh0c1tlLnR5cGVdIHx8IGAgPyR7ZS50eXBlfT8gYDtcclxuXHRcdFx0XHRsZXQgc3R5bGUgPSBgb3BhY2l0eToke29wYWNpdHl9OyAke3N0eWxlTWFwW2UudHlwZV0gfHwgJyd9YDtcclxuXHRcdFx0XHRsZXQgZGF0YSA9IHsgdGV4dCwgc3R5bGUsIC4uLmUgfTtcclxuXHJcblx0XHRcdFx0aWYgKGUudHlwZSAhPSAnRE9XTlJBTksnICYmIGUudHlwZSAhPSAnVVBSQU5LJykgcmV0dXJuIFtkYXRhXTtcclxuXHRcdFx0XHRlbHNlIHJldHVybiBBcnJheShNYXRoLmFicyhlLmRlbHRhKSkuZmlsbCgwKS5tYXAoZSA9PiBkYXRhKTtcclxuXHRcdFx0fSkuc2xpY2UoMCwgMTApLnJldmVyc2UoKTtcclxuXHRcdC8vIGNvbnNvbGUudGltZUVuZCgpXHJcblx0XHRyZXR1cm4gVnVlLm1hcmtSYXcodik7XHJcblx0fVxyXG5cclxuXHRmb3JtYXQobjogbnVtYmVyKSB7XHJcblx0XHRyZXR1cm4gbnVtYmVyRm9ybWF0dGVyLmZvcm1hdChuKTtcclxuXHR9XHJcblxyXG5cdGdldCBiaWFzKCkge1xyXG5cdFx0bGV0IHZhbHVlID0gdGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5iaWFzO1xyXG5cdFx0bGV0IGNvc3QgPSB0aGlzLmxhZGRlci5nZXRCaWFzQ29zdCgpO1xyXG5cdFx0bGV0IHBvaW50cyA9IHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucG9pbnRzO1xyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHZhbHVlLCBjb3N0LCBwb2ludHMsXHJcblx0XHRcdGNhbjogcG9pbnRzID49IGNvc3QsXHJcblx0XHRcdHBlcmNlbnQ6IE1hdGgubWluKDEwMCwgTWF0aC5mbG9vcihwb2ludHMgLyBjb3N0ICogMTAwKSksXHJcblx0XHRcdHNWYWx1ZTogJysnICsgdmFsdWUudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpLFxyXG5cdFx0XHRzQ29zdDogdGhpcy5mb3JtYXQoY29zdCksXHJcblx0XHRcdHNQb2ludHM6IHRoaXMuZm9ybWF0KHBvaW50cyksXHJcblx0XHRcdGNhblJlcXVlc3Q6IHRoaXMubGFkZGVyLmNhblJlcXVlc3QoJ2JpYXMnKSxcclxuXHRcdFx0ZG9SZXF1ZXN0OiAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5sYWRkZXIucmVxdWVzdCgnYmlhcycpO1xyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHR9XHJcblx0Z2V0IG11bHRpKCkge1xyXG5cdFx0bGV0IHZhbHVlID0gdGhpcy5sYWRkZXIuc3RhdGUueW91clJhbmtlci5tdWx0aXBsaWVyO1xyXG5cdFx0bGV0IGNvc3QgPSB0aGlzLmxhZGRlci5nZXRNdWx0aXBsaWVyQ29zdCgpO1xyXG5cdFx0bGV0IHBvaW50cyA9IHRoaXMubGFkZGVyLnN0YXRlLnlvdXJSYW5rZXIucG93ZXI7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dmFsdWUsIGNvc3QsIHBvaW50cyxcclxuXHRcdFx0Y2FuOiBwb2ludHMgPj0gY29zdCxcclxuXHRcdFx0cGVyY2VudDogTWF0aC5taW4oMTAwLCBNYXRoLmZsb29yKHBvaW50cyAvIGNvc3QgKiAxMDApKSxcclxuXHRcdFx0c1ZhbHVlOiAneCcgKyB2YWx1ZS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyksXHJcblx0XHRcdHNDb3N0OiB0aGlzLmZvcm1hdChjb3N0KSxcclxuXHRcdFx0c1BvaW50czogdGhpcy5mb3JtYXQocG9pbnRzKSxcclxuXHRcdFx0Y2FuUmVxdWVzdDogdGhpcy5sYWRkZXIuY2FuUmVxdWVzdCgnbXVsdGknKSxcclxuXHRcdFx0ZG9SZXF1ZXN0OiAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5sYWRkZXIucmVxdWVzdCgnbXVsdGknKTtcclxuXHRcdFx0fSxcclxuXHRcdH07XHJcblx0fVxyXG5cdGZyYW1lRHVyYXRpb24gPSAnJztcclxuXHRmcmFtZXMgPSAnJztcclxuXHRtb3VudGVkKCkge1xyXG5cdFx0dm9pZCAoYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRsZXQgZnJhbWVzID0gWzBdO1xyXG5cdFx0XHRsZXQgbGFzdCA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHR3aGlsZSAoMSkge1xyXG5cdFx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlcXVlc3RBbmltYXRpb25GcmFtZSk7XHJcblx0XHRcdFx0bGV0IG5vdyA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRcdGxldCBkZWx0YSA9IG5vdyAtIGxhc3Q7XHJcblx0XHRcdFx0aWYgKGRlbHRhID4gMzApXHJcblx0XHRcdFx0XHRmcmFtZXMudW5zaGlmdChkZWx0YSk7XHJcblx0XHRcdFx0bGFzdCA9IG5vdztcclxuXHRcdFx0XHRpZiAoZnJhbWVzLmxlbmd0aCA+IDMwKSBmcmFtZXMucG9wKCk7XHJcblx0XHRcdFx0dGhpcy5mcmFtZXMgPSBmcmFtZXMubWFwKGUgPT4gZS50b0ZpeGVkKDApLnBhZFN0YXJ0KDMsICcwJykpLmpvaW4oJywgJyk7XHJcblx0XHRcdFx0dGhpcy5mcmFtZUR1cmF0aW9uID0gZnJhbWVzLnNsaWNlKDAsIDEwKVxyXG5cdFx0XHRcdFx0LnJlZHVjZSgodiwgZSwgaSwgYSkgPT4gdiArIGUgLyBhLmxlbmd0aCwgMCkudG9GaXhlZCgzKTtcclxuXHRcdFx0fVxyXG5cdFx0fSkoKVxyXG5cdH1cclxufSJdfQ==