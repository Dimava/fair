

class ChatMessage {
	username: string = "Chad, the Listener";
	message: string = "Sorry, I'm currently resting my ears. If you want to be heard, head over into our Discord. https://discord.gg/Ud7UfFJmYj ";
	timesAsshole: number = 0;
	accountId: accountId = 0;
	timeCreated: string = "00:00";
}




class FairChat {
	socket?: FairSocket;
	ladderNum = 1;

	userData = new UserData();
	state = Vue.reactive({
		connected: false,
		connectionRequested: false,
		currentChatNumber: -1,
		messages: [new ChatMessage()],
		loading: false,
	});

	chatSubscription?: StompJs.StompSubscription;
	connect() {
		if (!this.socket) throw 0;
		if (!this.userData.uuid) throw 0;
		if (this.state.connected || this.state.connectionRequested) return false;
		this.state.connectionRequested = true;

		this.chatSubscription = this.socket.subscribe('/topic/chat/$ladderNum', (data) => {
			this.handleChatUpdates(data);
		}, { uuid: this.userData.uuid }, this.ladderNum);
		this.socket.subscribe('/user/queue/chat/', (data) => {
			this.handleChatInit(data);
		}, { uuid: this.userData.uuid });
		this.socket.send('/app/chat/init/$ladderNum', { uuid: this.userData.uuid }, this.ladderNum);
	}


	handleChatUpdates(message: FairSocketSubscribeResponseMap['/topic/chat/$ladderNum']) {
		if (!message) return;
		this.state.messages.unshift(message);
		this.state.loading = false;
		// if (chatData.messages.length > 30) chatData.messages.pop();
	}
	handleChatInit(message: FairSocketSubscribeResponseMap['/user/queue/chat/']) {
		if (message.status === "OK") {
			if (message.content) {
				this.state.connectionRequested = false;
				this.state.connected = true;
				this.ladderNum = message.content.currentChatNumber;
				this.state.currentChatNumber = message.content.currentChatNumber;
				this.state.messages = message.content.messages;
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
}) {
	newMessage = '';
	loading = false;

	newUsernameModalOpen = false;
	newUsername = '';

	@VueTemplate
	get _t() {
		let message = this.chat.state.messages[0];
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
								<template #content><p>{${this.htmlToText(message.message)}}</p></template>
								<template #datetime>{${message.timeCreated}}</template>
							</a-comment>
						</a-list-item>
					</template>
				</a-list>
				<a-list
						class="fair-chat-new"
						:data-source="[1]"
						size="small" bordered
						item-layout="vertical"

						>
					<template #renderItem="{ item: message }">
						<a-list-item>
							<a-comment>
								<template #avatar><b>{${this.assholeMark(123)}}</b></template>
								<template #author>
									{${this.chat.userData.username}}
									<span @click="changeUsername">🖉</span>
								</template>
								<template #content>								
									<a-input-search
											v-model:value="newMessage"
											placeholder="Chad is listening..."
											@search="sendMessage"
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
						@ok="confirmNameChange"
						>
					<a-input ref="elNewUsernameInput" v-model:value="newUsername" @pressEnter="confirmNameChange" :maxlength="32" />
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