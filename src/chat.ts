

class ChatMessage {
	username: string = "Chad, the Listener";
	message: string = "Sorry, I'm currently resting my ears. If you want to be heard, head over into our Discord. https://discord.gg/Ud7UfFJmYj ";
	timesAsshole: number = 0;
	accountId: accountId = 0;
	timeCreated: string = "00:00";
}




class FairChat {
	socket?: FairSocket;

	userData = new UserData();
	state = Vue.reactive({
		connected: false,
		connectionRequested: false,
		currentChatNumber: -1,
		messages: [new ChatMessage()],
		loading: false,
	});

	chatSubscription?: StompJs.StompSubscription;
	constructor() {
		return Vue.markRaw(this);
	}
	connect() {
		if (!this.socket) throw 0;
		if (!this.userData.uuid) throw 0;
		if (this.state.connected || this.state.connectionRequested) throw 0;
		this.state.connectionRequested = true;
		let resolveConnected: () => void;

		this.chatSubscription = this.socket.subscribe('/topic/chat/$ladderNum', (data) => {
			this.handleChatUpdates(data);
		}, { uuid: this.userData.uuid }, this.userData.chatNum);
		this.socket.subscribe('/user/queue/chat/', (data) => {
			this.handleChatInit(data);
			resolveConnected();
		}, { uuid: this.userData.uuid });
		this.socket.send('/app/chat/init/$ladderNum', { uuid: this.userData.uuid }, this.userData.chatNum);

		return new Promise<void>(resolve => { resolveConnected = resolve; });
	}


	handleChatUpdates(message: FairSocketSubscribeResponseMap['/topic/chat/$ladderNum']) {
		if (!message) return;
		message.username = unescapeHtml(message.username);
		message.message = unescapeHtml(message.message);
		this.state.messages.unshift(Object.assign(new ChatMessage(), message));
		this.state.loading = false;
		// if (chatData.messages.length > 30) chatData.messages.pop();
	}
	handleChatInit(message: FairSocketSubscribeResponseMap['/user/queue/chat/']) {
		if (message.status === "OK") {
			if (message.content) {
				this.state.connectionRequested = false;
				this.state.connected = true;
				this.state.currentChatNumber = message.content.currentChatNumber;
				this.state.messages = message.content.messages.map(e => Object.assign(new ChatMessage, e));

				antd.message.success(
					`Connected to Chad#${message.content.currentChatNumber} !`,
					10,
				);
			}
		}
	}

	sendMessage(message: string) {
		if (!this.socket) throw 0;
		if (message == "") return;

		message = message.slice(0, 280);

		this.socket.send('/app/chat/post/$currentChatNumber', {
			uuid: this.userData.uuid,
			content: message,
		}, this.state.currentChatNumber);
	}


	// function changeChatRoom(ladderNum) {
	//     chatSubscription.unsubscribe();
	//     chatSubscription = stompClient.subscribe('/topic/chat/' + ladderNum,
	//         (message) => handleChatUpdates(JSON.parse(message.body)), {uuid: getCookie("_uuid")});
	//     initChat(ladderNum);
	// }

	// function updateChatUsername(event) {
	//     chatData.messages.forEach(message => {
	//         if (event.accountId === message.accountId) {
	//             message.username = event.data;
	//         }
	//     })
	//     updateChat();
	// }
	changeUsername(newUsername: string): boolean {
		newUsername = newUsername.slice(0, 32);
		if (!newUsername) return false;
		if (!newUsername.trim()) return false;
		if (newUsername == this.userData.username) return false;
		this.socket?.send('/app/account/name', {
			uuid: this.userData.uuid,
			content: newUsername,
		});
		this.userData.username = newUsername;
		return true;
	}

}

@GlobalComponent
class FairChatVue extends VueWithProps({
	chat: FairChat,
	ladder: FairLadder,
}) {
	newMessage = '';
	loading = false;

	newUsernameModalOpen = false;
	newUsername = '';

	@VueTemplate
	get _t() {
		let message = this.chat.state.messages[0];
		let a = new Ranker(); // this.extractMentions(message)[0];
		let r = this.ladder.state.rankersById[0];
		return `
			<CHAT>
				<a-list
						class="fair-chat"
						:data-source="${this.chat.state.messages}"
						size="small" bordered
						>
					<template #header>
						<h2>Welcome to the Chad#{${this.chat.state.currentChatNumber}} !</h2>
					</template>
					<template #renderItem="{ item: message }">
						<a-list-item>
							<a-comment>
								<template #avatar><b>{${this.assholeMark(message.timesAsshole)}}</b></template>
								<template #author><b>{${message.username}}</b></template>
								<template #content>
									<p>
										<template v-for="a of ${this.extractMentions(message)}">
											<template v-if="${typeof a == 'string'}">{${a}}</template>
											<span v-else
												class="chat-mention"
												>@{${a.username}}<sup
													>#{${a.interpolated.rank + (a.growing ? '' : '^')}}</sup></span>
										</template>
									</p>
								</template>
								<template #datetime>{${message.timeCreated}}</template>
							</a-comment>
						</a-list-item>
					</template>
				</a-list>
				<a-list
						class="fair-chat-new"
						:data-source="${[1]}"
						size="small" bordered
						item-layout="vertical"
						>
					<template #renderItem="{ item: message }">
						<a-list-item>
							<a-comment>
								<template #avatar><b>{${this.assholeMark(123)}}</b></template>
								<template #author>
									{${this.chat.userData.username}}
									<span @click="${this.changeUsername()}">🖉</span>
								</template>
								<template #content>

									<a-mentions
										v-model:value="${this.newMessage}"
										placeholder="Chad mentions is listening..."
										@search="${this.updatePossibleMentions}"
										@keyup.enter.prevent="${this.sendMessage()}"
										>
										<a-mentions-option
											v-for="r in ${this.possibleMentions}"
											:value="${r.username + '#' + r.accountId}"
											>
											<div
												:class="${{ 'mention-not-chatting': !this.chatMessageCounts[r.accountId] }}"
												>
												<b>{${this.assholeMark(r.timesAsshole)}}</b>
												{${r.username}} [{{this.chatMessageCounts[r.accountId]}}]
												<sup>#{${r.interpolated.rank + (r.growing ? '' : '^')}}</sup>
											</div>
										</a-mentions-option>
									</a-mentions>
									<a-button type="primary" @click="${this.sendMessage()}"> Send </a-button>

									<a-input-search v-if="0"
											v-model:value="${this.newMessage}"
											placeholder="Chad is listening..."
											@search="${this.sendMessage()}"
											:loading="${this.chat.state.loading}"
											enter-button="Send"
											/>
								</template>
							</a-comment>
						</a-list-item>
					</template>
				</a-list>
				<a-modal
						v-model:visible="${this.newUsernameModalOpen}"
						title="What shall be your new name?"
						@ok="${this.confirmNameChange()}"
						>
					<a-input ref="elNewUsernameInput" v-model:value="${this.newUsername}" @pressEnter="${this.confirmNameChange()}" maxlength="32" />
				</a-modal>
			</CHAT>
		`;
	}
	assholeMark(n: number) {
		if (n == 0) return '@';
		const marks = ["@", "♠", "♣", "♥", "♦"];
		return marks[n] || marks.pop();
	}
	htmlToText(s: string) {
		let a = document.createElement('a');
		a.innerHTML = s;
		return a.innerText;
	}
	possibleMentions = [new Ranker()];
	chatMessageCounts = {} as Record<accountId, number>
	updatePossibleMentions(s: string) {
		let rankers = Object.values(this.ladder.state.rankersById);
		let counts = Vue.toRaw(this.chat.state.messages).map(e => e.accountId).reduce((v, e) => (v[e] ??= 0, v[e]++, v), {} as Record<accountId, number>);
		this.chatMessageCounts = counts;
		rankers.sort((a, b) => (counts[b.accountId] ?? 0) - (counts[a.accountId] ?? 0));
		return this.possibleMentions = rankers.filter(e => e.username.startsWith(s)).slice(0, 8);
	}
	extractMentions(message: ChatMessage) {
		let s = this.htmlToText(message.message);
		let rankers = Object.values(Vue.toRaw(this.ladder.state.rankersById));
		let rpl = (r: Ranker) => [
			`@${r.username}#${r.accountId}`, `<@#${r.accountId}>`,
			`@${r.username}`, `<@#${r.accountId}>`,
			`@#${r.accountId}`, `<@#${r.accountId}>`,
			`<<@#${r.accountId}>>`, `<@#${r.accountId}>`,
		]
		for (let i = 0; i < 4; i++) {
			for (let r of rankers) {
				let [p, l] = rpl(r);
				if (s.includes(p)) {
					console.log({s, p, l, r});
					s = s.replace(p, l);
				}
			}
		}

		Object.assign(globalThis, { _cv: this });
		return s.match(/<@#\d+>|((?!<@#\d+>)[^])+/g)!.map(e => {
			let m1 = e.match(/<@#(\d+)>/);
			if (!m1) return e;
			return this.ladder.state.rankersById[+m1[1]] ?? new Ranker();;
		});
		// let matches = s.match(/@[^@#]{0,32}#\d+|[^@]+/) ?? [];
		// return matches.flatMap(m => {
		// 	if (!m.startsWith('@')) return [m];
		// 	let [_, name, id] = m.split(/@#/);
		// 	if (!id) return
		// });
	}
	async sendMessage() {
		this.chat.state.loading = true;
		await new Promise(r => setTimeout(r, 400));
		this.chat.sendMessage(this.newMessage);
		while (this.chat.state.loading) {
			await new Promise(r => setTimeout(r, 100));
		}
		this.newMessage = '';
	}
	changeUsername() {
		this.newUsername = this.chat.userData.username;
		this.newUsernameModalOpen = true;
		setTimeout(() => {
			let input = this.$refs.elNewUsernameInput as HTMLInputElement;
			input?.focus();
		});
	}
	confirmNameChange() {
		this.newUsernameModalOpen = false;
		this.chat.changeUsername(this.newUsername);
	}
}