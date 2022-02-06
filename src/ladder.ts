


class Player {
	constructor() {
		return Vue.reactive(this);
	}
}

class Ranker {
	accountId: accountId = 0;
	username: string = '';
	points: number = 0;
	power: number = 1;
	bias: number = 0;
	multiplier: number = 1;
	you: boolean = false;
	growing: boolean = true;
	timesAsshole: number = 0;
	grapes: number = 0;
	vinegar: number = 0;

	rank: number = 0;
	autoPromote: boolean = false;
	static from(source: SocketYouRanker): YouRanker;
	static from(source: SocketRanker): Ranker;
	static from(source: SocketRanker | SocketYouRanker): Ranker | YouRanker {
		let ranker = source.you ? new YouRanker() : new Ranker();
		ranker.username = source.username;
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
			let youSource = source as SocketYouRanker;
			let youRanker = ranker as YouRanker;
			youRanker.autoPromote = youSource.autoPromote;
			youRanker.grapes = +youSource.grapes;
			youRanker.vinegar = +youSource.vinegar;
		}
		return ranker;
	}
}
class YouRanker extends Ranker {
	you = true;
}

class FairLadder {
	socket?: FairSocket;
	userData = new UserData();
	state = VueReactive({
		connected: false,
		connectionRequested: false,
		rankersById: {} as Record<number, Ranker>,
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
			assholeTags: [''],
			baseVinegarNeededToThrow: 1000000,
			baseGrapesNeededToAutoPromote: 2000,
			manualPromoteWaitTime: 15,
			autoPromoteLadder: 2
		},

		pointsNeededForManualPromote: 0,
	});
	ladderSubscription: any;
	connect() {
		if (!this.socket) throw 0;
		if (!this.userData.uuid) throw 0;
		if (this.state.connected || this.state.connectionRequested) return false;
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

		this.socket.send('/app/ladder/init/$ladderNum'
			, { uuid: this.userData.uuid }, this.state.ladderNum);

		this.socket.subscribe('/user/queue/info', (data) => {
			this.handleInfo(data);
		}, { uuid: this.userData.uuid });

		this.socket.send('/app/info'
			, { uuid: this.userData.uuid })

	}
	disconnect() {
		// todo
	}


	handleLadderUpdates(message: FairSocketSubscribeResponseMap['/topic/ladder/$ladderNum']) {
		for (let event of message.events) {
			this.handleEvent(event);
		}
		this.calculateLadder(message.secondsPassed);
	}

	handleEvent(event: SocketLadderEvent) {
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
				ranker.username = event.data.username;
				ranker.rank = this.state.rankers.length + 1;
				if (!this.state.rankers.find(e => e.accountId == event.accountId)) {
					this.state.rankers.push(ranker);
				}
				break;
			}
			case 'NAME_CHANGE': {
				let ranker = this.state.rankersById[event.accountId];
				ranker.username = event.data;
				break;
			}
			case 'RESET': {
				// disconnect is made automatically
				location.reload();
				break;
			}
		}
	}


	getAutoPromoteGrapeCost(rank: number) {
		let infoData = this.state.infoData;
		let minPeople = Math.max(infoData.minimumPeopleForPromote, this.state.currentLadder.number);
		let divisor = Math.max(rank - minPeople + 1, 1);
		return Math.floor(infoData.baseGrapesNeededToAutoPromote / divisor);
	}

	handleInfo(message: FairSocketSubscribeResponseMap['/user/queue/info']) {
		this.state.infoData = {
			assholeLadder: message.assholeLadder,
			assholeTags: message.assholeTags,
			autoPromoteLadder: message.autoPromoteLadder,
			baseGrapesNeededToAutoPromote: +message.baseGrapesNeededToAutoPromote,
			baseVinegarNeededToThrow: +message.baseVinegarNeededToThrow,
			manualPromoteWaitTime: message.manualPromoteWaitTime,
			minimumPeopleForPromote: message.minimumPeopleForPromote,
			pointsForPromote: +message.pointsForPromote,
		}
	}

	handlePrivateLadderUpdates(message: FairSocketSubscribeResponseMap['/user/queue/ladder/updates']) {
		for (let event of message.events) {
			this.handleEvent(event);
		}
	}

	handleLadderInit(message: FairSocketSubscribeResponseMap['/user/queue/ladder/']) {
		if (message.status === "OK") {
			if (message.content) {
				localStorage._ladder = JSON.stringify(message);
				console.log(message);
				this.state.currentLadder.number = message.content.currentLadder.number;
				this.state.startRank = message.content.startRank;
				this.state.rankers = message.content.rankers.map(e => Ranker.from(e));
				this.state.rankersById = Object.fromEntries(this.state.rankers.map(e => [e.accountId, e]));
				this.state.yourRanker = this.state.rankersById[message.content.yourRanker.accountId] as YouRanker;
				this.state.firstRanker = this.state.rankers[0];

				this.state.connectionRequested = false;
				this.state.connected = true;
			}
		}
	}

	calculateLadder(secondsPassed: number) {
		// FIXME this uses 400ms per 8k rankers
		this.state.rankers.sort((a, b) => b.points - a.points);

		let ladderStats = {
			growingRankerCount: 0,
			pointsNeededForManualPromote: 0,
			eta: 0
		}

		this.state.rankers.forEach((ranker, index) => {
			let rank = index + 1;
			ranker.rank = rank;
			// If the ranker is currently still on ladder
			if (!ranker.growing) return;
			ladderStats.growingRankerCount += 1;

			// Calculating Points & Power
			if (rank != 1) {
				ranker.power += Math.floor((ranker.bias + rank - 1) * secondsPassed);
			}
			ranker.points += Math.floor(ranker.power * secondsPassed);


			// Calculating Vinegar based on Grapes count
			if (rank == 1) {
				if (this.state.currentLadder.number === 1)
					ranker.vinegar *= ~~(0.9975 ** secondsPassed);
			} else {
				ranker.vinegar += ~~(ranker.grapes * secondsPassed)
			}
		});

		// let rankersOld = this.state.rankers.slice();
		// FIXME this uses 400ms per 8k rankers
		this.state.rankers.sort((a, b) => b.points - a.points);

		this.state.rankers.forEach((ranker, index, list) => {
			let rank = index + 1;
			if (rank == ranker.rank) return;

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
			if (!firstRanker.you) return firstRanker.points + 1;
			return secondRanker.points + 1;
		}

		let leadingRanker = firstRanker;
		let pursuingRanker = firstRanker.you ? secondRanker : firstRanker;

		// How many more points does the ranker gain against his pursuer, every Second
		let powerDiff = (leadingRanker.growing ? pursuingRanker.power : 0) - (pursuingRanker.growing ? pursuingRanker.power : 0);
		// Calculate the needed Point difference, to have f.e. 30seconds of point generation with the difference in power
		let neededPointDiff = Math.abs(powerDiff * infoData.manualPromoteWaitTime);

		return Math.max(
			(leadingRanker.you ? pursuingRanker : leadingRanker).points + neededPointDiff,
			infoData.pointsForPromote
		);
	}


}

@GlobalComponent
class FairLadderVue extends VueWithProps({
	ladder: FairLadder,
}) {
	@VueTemplate
	get _t() {
		return `
			<LADDER>
				<a-table
					:columns="columns"
					:data-source="tableData"
					size="small"
					:rowClassName="(record, index)=>rowClassName(record)"
					:pagination="pagination"
					tableLayout="fixed"
					>
				</a-table>

				<a-checkbox v-model:checked="onlyMe"> Show You </a-checkbox>
			</LADDER>
		`
	}
	onlyMe = true;
	get pageSize() {
		return this.nearRankers * 2 + 1;
	}
	nearRankers = 7;
	get columns() {
		return [
			{ title: '#', dataIndex: 'rank' },
			{ title: 'Username', dataIndex: 'username' },
			{ title: 'Power', dataIndex: 'power' },
			{ title: 'Points', dataIndex: 'points' },
		];
	}
	get tableData() {
		if (this.onlyMe) {
			let state = this.ladder.state;
			let middleRank = state.yourRanker.rank;
			middleRank = Math.min(middleRank, state.rankers.length - this.nearRankers);
			middleRank = Math.max(middleRank, this.nearRankers + 1);
			let rankers = [state.firstRanker, ...state.rankers.slice(middleRank - this.nearRankers, middleRank + this.nearRankers)];
			return rankers;
		}
		// return [];
		return this.ladder.state.rankers//.slice(0, 10);
	}
	get pagination() {
		return {
			defaultPageSize: this.pageSize,
			defaultCurrent: ~~(this.ladder.state.yourRanker.rank / this.pageSize) + 1,
			hideOnSinglePage: true,
		};
	}
	rowClassName(record: Ranker) {
		return record.you ? 'row-you' : '';
	}
}