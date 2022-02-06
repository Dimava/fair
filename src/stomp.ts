
type DecimalString = string & { _?: 'DecimalString' };

type _ConstructEvent<EvType extends string, Data extends {}> = 
	| {eventType: EvType} & Data;
interface SocketLadderEventMap {
	BIAS: {
		eventType: 'BIAS',
		accountId: accountId,
	};
	MULTI: {
		eventType: 'MULTI',
		accountId: accountId,
	};
	VINEGAR: {
		eventType: 'VINEGAR',
		accountId: accountId,
		data: {
			amount: DecimalString,
			success: boolean,
		}
	};
	SOFT_RESET_POINTS: {
		eventType: 'SOFT_RESET_POINTS',
		accountId: accountId,
	};
	PROMOTE: {
		eventType: 'PROMOTE',
		accountId: accountId,
	};
	AUTO_PROMOTE: {
		eventType: 'AUTO_PROMOTE',
		accountId: accountId,
	};
	JOIN: {
		eventType: 'JOIN',
		accountId: accountId,
		data: {
			username: string,
		}
	};
	NAME_CHANGE: {
		eventType: 'NAME_CHANGE',
		accountId: accountId,
		data: string,
	};
	RESET: {
		eventType: 'RESET',
	};
}
type SocketLadderEvent = SocketLadderEventMap[keyof SocketLadderEventMap]; 
interface SocketChatMessage {
	username: string;
	accountId: accountId;
	message: string;
	timeCreated: string;
	timesAsshole: number;
}
interface SocketRanker {
	accountId: accountId;
	bias: number;
	growing: boolean;
	multiplier: number;
	points: DecimalString;
	power: DecimalString;
	rank: number;
	timesAsshole: number;
	username: string;
	you: boolean;
}
interface SocketYouRanker extends SocketRanker {
	autoPromote: boolean;
	grapes: DecimalString;
	vinegar: DecimalString;
	you: true;
}


interface FairSocketSendRequestMap {
	'/app/account/login': { uuid: uuid },
	'/app/account/name': { uuid: uuid, content: string & { _?: 'newUsername' } },
	'/app/chat/init/$ladderNum': { uuid: uuid },
	'/app/chat/post/$currentChatNumber': { uuid: uuid, content: string & { _?: 'message' } },
	'/app/info': { uuid: uuid },
	'/app/ladder/init/$ladderNum': { uuid: uuid },
	'/app/ladder/post/asshole': { uuid: uuid },
	'/app/ladder/post/auto-promote': { uuid: uuid },
	'/app/ladder/post/bias': { uuid: uuid },
	'/app/ladder/post/multi': { uuid: uuid },
	'/app/ladder/post/promote': { uuid: uuid },
	'/app/ladder/post/vinegar': { uuid: uuid },
}

interface FairSocketSubscribeResponseMap {
	'/topic/chat/$ladderNum': SocketChatMessage,
	'/topic/ladder/$ladderNum': { events: SocketLadderEvent[], secondsPassed: number },
	'/user/queue/account/login': {
		status: 'OK' | 'CREATED' | '?',
		content: {
			uuid: uuid, accountId: number, highestCurrentLadder: number,
		}
	},
	'/user/queue/chat/': {
		status: 'OK' | '?',
		content: {
			currentChatNumber: number,
			messages: SocketChatMessage[],
		}
	},
	'/user/queue/info': {
		assholeLadder: number,
		assholeTags: string[],
		autoPromoteLadder: number,
		baseGrapesNeededToAutoPromote: DecimalString,
		baseVinegarNeededToThrow: DecimalString,
		manualPromoteWaitTime: number,
		minimumPeopleForPromote: number,
		pointsForPromote: DecimalString,
	},
	'/user/queue/ladder/': {
		status: 'OK' | '?',
		content: {
			currentLadder: { number: number },
			firstRanker: SocketRanker,
			yourRanker: SocketYouRanker,
			rankers: SocketRanker[],
			startRank: number,
		}
	},
	'/user/queue/ladder/updates': {
		events: SocketLadderEvent[],
	},
}

class FairSocket {
	stompClient: StompJs.CompatClient;
	userData = new UserData();
	state = Vue.reactive({
		connected: false,
		connectionRequested: false,
	});
	constructor() {
		this.stompClient = StompJs.Stomp.over(() => new SockJS('https://fair.kaliburg.de/fairsocket'));
		for (let k of [
			'onChangeState',
			'onConnect',
			'onDisconnect',
			'onStompError',
			'onUnhandledFrame',
			'onUnhandledMessage',
			'onUnhandledReceipt',
			'onWebSocketClose',
			'onWebSocketError',
		] as const) {
			// just logging everything
			this.stompClient[k] = (...a) => {
				console.warn(k, ...a);
				(this as any)[k]?.(...a);
			}
		}
		window.addEventListener('onbeforeunload', () => this.disconnect());
	}
	_resolveOnConnected: (() => void)[] = [];
	connect(): Promise<void> {
		this.state.connectionRequested = true;
		return new Promise(resolve => {
			if (this.stompClient.connected) {
				resolve();
			} else {
				this._resolveOnConnected.push(resolve);
				this.stompClient.connect({}, this.stompClient.onConnect);
			}
		});
	}
	disconnect() {
		this.stompClient.disconnect();
		this.state.connectionRequested = false;
		this.state.connected = false;
	}
	onConnect() {
		this.state.connectionRequested = false;
		this.state.connected = true;
		this._resolveOnConnected.map(e => e());
	}

	send<K extends Extract<keyof FairSocketSendRequestMap, `${string}$${string}`>>(destination: K, data: FairSocketSendRequestMap[K], number: number): void;
	send<K extends Exclude<keyof FairSocketSendRequestMap, `${string}$${string}`>>(destination: K, data: FairSocketSendRequestMap[K]): void;
	send<K extends keyof FairSocketSendRequestMap>(destination: K, data: FairSocketSendRequestMap[K], number?: number) {
		if (destination.includes('$')) {
			if (number == undefined) throw new Error('bad usage');
			destination = `${destination.split('$')[0]}${number}` as any;
		} else {
			if (number != undefined) throw new Error('bad usage');
		}
		this.stompClient.send(destination, {}, JSON.stringify(data));
	}
	subscribe<K extends Extract<keyof FairSocketSubscribeResponseMap, `${string}$${string}`>>(destination: K, listener: (data: FairSocketSubscribeResponseMap[K]) => void, request: { uuid: uuid }, number: number): StompJs.StompSubscription;
	subscribe<K extends Exclude<keyof FairSocketSubscribeResponseMap, `${string}$${string}`>>(destination: K, listener: (data: FairSocketSubscribeResponseMap[K]) => void, request: { uuid: uuid }): StompJs.StompSubscription;
	subscribe<K extends keyof FairSocketSubscribeResponseMap>(destination: K, listener: (data: FairSocketSubscribeResponseMap[K]) => void, request: { uuid: uuid }, number?: number) {
		if (destination.includes('$')) {
			if (number == undefined) throw new Error('bad usage');
			destination = `${destination.split('$')[0]}${number}` as any;
		} else {
			if (number != undefined) throw new Error('bad usage');
		}
		return this.stompClient.subscribe(destination, (message) => {
			let data = JSON.parse(message.body || 'null');
			console.warn(destination, data, message);
			listener(data);
		}, request);
	}
}
