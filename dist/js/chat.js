"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
class ChatMessage {
    username = "Chad, the Listener";
    message = "Sorry, I'm currently resting my ears. If you want to be heard, head over into our Discord. https://discord.gg/Ud7UfFJmYj ";
    timesAsshole = 0;
    accountId = 0;
    timeCreated = "00:00";
}
class FairChat {
    socket;
    ladderNum = 1;
    userData = new UserData();
    data = Vue.reactive({
        connected: false,
        connectionRequested: false,
        currentChatNumber: -1,
        messages: [new ChatMessage()],
        loading: false,
    });
    chatSubscription;
    connect() {
        if (!this.socket)
            throw 0;
        if (!this.userData.uuid)
            throw 0;
        if (this.data.connected || this.data.connectionRequested)
            return false;
        this.chatSubscription = this.socket.subscribe('/topic/chat/$ladderNum', (data) => {
            this.handleChatUpdates(data);
        }, { uuid: this.userData.uuid }, this.ladderNum);
        this.socket.subscribe('/user/queue/chat/', (data) => {
            this.handleChatInit(data);
        }, { uuid: this.userData.uuid });
        this.socket.send('/app/chat/init/$ladderNum', { uuid: this.userData.uuid }, this.ladderNum);
    }
    initChat(ladderNum) {
        if (!this.socket)
            throw 0;
        this.socket.send('/app/chat/init/$ladderNum', { uuid: this.userData.uuid }, ladderNum);
    }
    handleChatUpdates(message) {
        if (!message)
            return;
        this.data.messages.unshift(message);
        this.data.loading = false;
        // if (chatData.messages.length > 30) chatData.messages.pop();
    }
    handleChatInit(message) {
        if (message.status === "OK") {
            if (message.content) {
                this.data.connectionRequested = false;
                this.data.connected = true;
                this.ladderNum = message.content.currentChatNumber;
                this.data.currentChatNumber = message.content.currentChatNumber;
                this.data.messages = message.content.messages;
            }
        }
    }
    sendMessage(message) {
        if (!this.socket)
            throw 0;
        if (message == "")
            return;
        message = message.slice(0, 280);
        this.socket.send('/app/chat/post/$currentChatNumber', {
            uuid: this.userData.uuid,
            content: message,
        }, this.data.currentChatNumber);
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
    changeUsername(newUsername) {
        newUsername = newUsername.slice(0, 32);
        if (!newUsername)
            return false;
        if (!newUsername.trim())
            return false;
        if (newUsername == this.userData.username)
            return false;
        this.socket?.send('/app/account/name', {
            uuid: this.userData.uuid,
            content: newUsername,
        });
        this.userData.username = newUsername;
        return true;
    }
}
let FairChatVue = class FairChatVue extends VueWithProps({
    chat: FairChat,
}) {
    newMessage = '';
    loading = false;
    newUsernameModalOpen = false;
    newUsername = '';
    get _t() {
        let message = this.chat.data.messages[0];
        return `
			<CHAT>
				<a-list
						class="fair-chat"
						:data-source="${this.chat.data.messages}"
						size="small" bordered
						>
					<template #header>
						<h2>Welcome to the Chad#{${this.chat.data.currentChatNumber}} !</h2>
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
											:loading="${this.chat.data.loading}"
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
					<a-input id="new-username-modal-input" v-model:value="newUsername" @pressEnter="confirmNameChange" :maxlength="32" />
				</a-modal>
			</CHAT>
		`;
    }
    assholeMark(n) {
        if (n == 0)
            return '@';
        const marks = ["@", "♠", "♣", "♥", "♦"];
        return marks[n] || marks.pop();
    }
    htmlToText(s) {
        let a = document.createElement('a');
        a.innerHTML = s;
        return a.innerText;
    }
    async sendMessage() {
        this.chat.data.loading = true;
        await new Promise(r => setTimeout(r, 1000));
        let last = this.chat.data.messages[0];
        this.chat.sendMessage(this.newMessage);
    }
    changeUsername() {
        this.newUsername = this.chat.userData.username;
        this.newUsernameModalOpen = true;
        setTimeout(() => {
            let input = document.querySelector('input#new-username-modal-input');
            input?.focus();
        });
    }
    confirmNameChange() {
        this.newUsernameModalOpen = false;
        this.chat.changeUsername(this.newUsername);
    }
};
__decorate([
    VueTemplate
], FairChatVue.prototype, "_t", null);
FairChatVue = __decorate([
    GlobalComponent
], FairChatVue);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jaGF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFFQSxNQUFNLFdBQVc7SUFDaEIsUUFBUSxHQUFXLG9CQUFvQixDQUFDO0lBQ3hDLE9BQU8sR0FBVywySEFBMkgsQ0FBQztJQUM5SSxZQUFZLEdBQVcsQ0FBQyxDQUFDO0lBQ3pCLFNBQVMsR0FBYyxDQUFDLENBQUM7SUFDekIsV0FBVyxHQUFXLE9BQU8sQ0FBQztDQUM5QjtBQUtELE1BQU0sUUFBUTtJQUNiLE1BQU0sQ0FBYztJQUNwQixTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBRWQsUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7SUFDMUIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUM7UUFDbkIsU0FBUyxFQUFFLEtBQUs7UUFDaEIsbUJBQW1CLEVBQUUsS0FBSztRQUMxQixpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDckIsUUFBUSxFQUFFLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUM3QixPQUFPLEVBQUUsS0FBSztLQUNkLENBQUMsQ0FBQztJQUVILGdCQUFnQixDQUE2QjtJQUM3QyxPQUFPO1FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO1lBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUI7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUV2RSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNoRixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7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LENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztRQUMvQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO1FBQ2pDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZixJQUFJLEtBQUssR0FBcUIsUUFBUSxDQUFDLGFBQWEsQ0FBQyxnQ0FBZ0MsQ0FBRSxDQUFDO1lBQ3hGLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUNoQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFDRCxpQkFBaUI7UUFDaEIsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FBQztRQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUNELENBQUE7QUF6RkE7SUFEQyxXQUFXO3FDQTZEWDtBQXRFSSxXQUFXO0lBRGhCLGVBQWU7R0FDVixXQUFXLENBbUdoQiIsInNvdXJjZXNDb250ZW50IjpbIlxyXG5cclxuY2xhc3MgQ2hhdE1lc3NhZ2Uge1xyXG5cdHVzZXJuYW1lOiBzdHJpbmcgPSBcIkNoYWQsIHRoZSBMaXN0ZW5lclwiO1xyXG5cdG1lc3NhZ2U6IHN0cmluZyA9IFwiU29ycnksIEknbSBjdXJyZW50bHkgcmVzdGluZyBteSBlYXJzLiBJZiB5b3Ugd2FudCB0byBiZSBoZWFyZCwgaGVhZCBvdmVyIGludG8gb3VyIERpc2NvcmQuIGh0dHBzOi8vZGlzY29yZC5nZy9VZDdVZkZKbVlqIFwiO1xyXG5cdHRpbWVzQXNzaG9sZTogbnVtYmVyID0gMDtcclxuXHRhY2NvdW50SWQ6IGFjY291bnRJZCA9IDA7XHJcblx0dGltZUNyZWF0ZWQ6IHN0cmluZyA9IFwiMDA6MDBcIjtcclxufVxyXG5cclxuXHJcblxyXG5cclxuY2xhc3MgRmFpckNoYXQge1xyXG5cdHNvY2tldD86IEZhaXJTb2NrZXQ7XHJcblx0bGFkZGVyTnVtID0gMTtcclxuXHJcblx0dXNlckRhdGEgPSBuZXcgVXNlckRhdGEoKTtcclxuXHRkYXRhID0gVnVlLnJlYWN0aXZlKHtcclxuXHRcdGNvbm5lY3RlZDogZmFsc2UsXHJcblx0XHRjb25uZWN0aW9uUmVxdWVzdGVkOiBmYWxzZSxcclxuXHRcdGN1cnJlbnRDaGF0TnVtYmVyOiAtMSxcclxuXHRcdG1lc3NhZ2VzOiBbbmV3IENoYXRNZXNzYWdlKCldLFxyXG5cdFx0bG9hZGluZzogZmFsc2UsXHJcblx0fSk7XHJcblxyXG5cdGNoYXRTdWJzY3JpcHRpb24/OiBTdG9tcEpzLlN0b21wU3Vic2NyaXB0aW9uO1xyXG5cdGNvbm5lY3QoKSB7XHJcblx0XHRpZiAoIXRoaXMuc29ja2V0KSB0aHJvdyAwO1xyXG5cdFx0aWYgKCF0aGlzLnVzZXJEYXRhLnV1aWQpIHRocm93IDA7XHJcblx0XHRpZiAodGhpcy5kYXRhLmNvbm5lY3RlZCB8fCB0aGlzLmRhdGEuY29ubmVjdGlvblJlcXVlc3RlZCkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdHRoaXMuY2hhdFN1YnNjcmlwdGlvbiA9IHRoaXMuc29ja2V0LnN1YnNjcmliZSgnL3RvcGljL2NoYXQvJGxhZGRlck51bScsIChkYXRhKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlQ2hhdFVwZGF0ZXMoZGF0YSk7XHJcblx0XHR9LCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9LCB0aGlzLmxhZGRlck51bSk7XHJcblx0XHR0aGlzLnNvY2tldC5zdWJzY3JpYmUoJy91c2VyL3F1ZXVlL2NoYXQvJywgKGRhdGEpID0+IHtcclxuXHRcdFx0dGhpcy5oYW5kbGVDaGF0SW5pdChkYXRhKTtcclxuXHRcdH0sIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0pO1xyXG5cdFx0dGhpcy5zb2NrZXQuc2VuZCgnL2FwcC9jaGF0L2luaXQvJGxhZGRlck51bScsIHsgdXVpZDogdGhpcy51c2VyRGF0YS51dWlkIH0sIHRoaXMubGFkZGVyTnVtKTtcclxuXHR9XHJcblxyXG5cclxuXHRpbml0Q2hhdChsYWRkZXJOdW06IG51bWJlcikge1xyXG5cdFx0aWYgKCF0aGlzLnNvY2tldCkgdGhyb3cgMDtcclxuXHRcdHRoaXMuc29ja2V0LnNlbmQoJy9hcHAvY2hhdC9pbml0LyRsYWRkZXJOdW0nLCB7IHV1aWQ6IHRoaXMudXNlckRhdGEudXVpZCB9LCBsYWRkZXJOdW0pO1xyXG5cdH1cclxuXHJcblxyXG5cdGhhbmRsZUNoYXRVcGRhdGVzKG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3RvcGljL2NoYXQvJGxhZGRlck51bSddKSB7XHJcblx0XHRpZiAoIW1lc3NhZ2UpIHJldHVybjtcclxuXHRcdHRoaXMuZGF0YS5tZXNzYWdlcy51bnNoaWZ0KG1lc3NhZ2UpO1xyXG5cdFx0dGhpcy5kYXRhLmxvYWRpbmcgPSBmYWxzZTtcclxuXHRcdC8vIGlmIChjaGF0RGF0YS5tZXNzYWdlcy5sZW5ndGggPiAzMCkgY2hhdERhdGEubWVzc2FnZXMucG9wKCk7XHJcblx0fVxyXG5cdGhhbmRsZUNoYXRJbml0KG1lc3NhZ2U6IEZhaXJTb2NrZXRTdWJzY3JpYmVSZXNwb25zZU1hcFsnL3VzZXIvcXVldWUvY2hhdC8nXSkge1xyXG5cdFx0aWYgKG1lc3NhZ2Uuc3RhdHVzID09PSBcIk9LXCIpIHtcclxuXHRcdFx0aWYgKG1lc3NhZ2UuY29udGVudCkge1xyXG5cdFx0XHRcdHRoaXMuZGF0YS5jb25uZWN0aW9uUmVxdWVzdGVkID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy5kYXRhLmNvbm5lY3RlZCA9IHRydWU7XHJcblx0XHRcdFx0dGhpcy5sYWRkZXJOdW0gPSBtZXNzYWdlLmNvbnRlbnQuY3VycmVudENoYXROdW1iZXI7XHJcblx0XHRcdFx0dGhpcy5kYXRhLmN1cnJlbnRDaGF0TnVtYmVyID0gbWVzc2FnZS5jb250ZW50LmN1cnJlbnRDaGF0TnVtYmVyO1xyXG5cdFx0XHRcdHRoaXMuZGF0YS5tZXNzYWdlcyA9IG1lc3NhZ2UuY29udGVudC5tZXNzYWdlcztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0c2VuZE1lc3NhZ2UobWVzc2FnZTogc3RyaW5nKSB7XHJcblx0XHRpZiAoIXRoaXMuc29ja2V0KSB0aHJvdyAwO1xyXG5cdFx0aWYgKG1lc3NhZ2UgPT0gXCJcIikgcmV0dXJuO1xyXG5cclxuXHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnNsaWNlKDAsIDI4MCk7XHJcblxyXG5cdFx0dGhpcy5zb2NrZXQuc2VuZCgnL2FwcC9jaGF0L3Bvc3QvJGN1cnJlbnRDaGF0TnVtYmVyJywge1xyXG5cdFx0XHR1dWlkOiB0aGlzLnVzZXJEYXRhLnV1aWQsXHJcblx0XHRcdGNvbnRlbnQ6IG1lc3NhZ2UsXHJcblx0XHR9LCB0aGlzLmRhdGEuY3VycmVudENoYXROdW1iZXIpO1xyXG5cdH1cclxuXHJcblxyXG5cdC8vIGZ1bmN0aW9uIGNoYW5nZUNoYXRSb29tKGxhZGRlck51bSkge1xyXG5cdC8vICAgICBjaGF0U3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XHJcblx0Ly8gICAgIGNoYXRTdWJzY3JpcHRpb24gPSBzdG9tcENsaWVudC5zdWJzY3JpYmUoJy90b3BpYy9jaGF0LycgKyBsYWRkZXJOdW0sXHJcblx0Ly8gICAgICAgICAobWVzc2FnZSkgPT4gaGFuZGxlQ2hhdFVwZGF0ZXMoSlNPTi5wYXJzZShtZXNzYWdlLmJvZHkpKSwge3V1aWQ6IGdldENvb2tpZShcIl91dWlkXCIpfSk7XHJcblx0Ly8gICAgIGluaXRDaGF0KGxhZGRlck51bSk7XHJcblx0Ly8gfVxyXG5cclxuXHQvLyBmdW5jdGlvbiB1cGRhdGVDaGF0VXNlcm5hbWUoZXZlbnQpIHtcclxuXHQvLyAgICAgY2hhdERhdGEubWVzc2FnZXMuZm9yRWFjaChtZXNzYWdlID0+IHtcclxuXHQvLyAgICAgICAgIGlmIChldmVudC5hY2NvdW50SWQgPT09IG1lc3NhZ2UuYWNjb3VudElkKSB7XHJcblx0Ly8gICAgICAgICAgICAgbWVzc2FnZS51c2VybmFtZSA9IGV2ZW50LmRhdGE7XHJcblx0Ly8gICAgICAgICB9XHJcblx0Ly8gICAgIH0pXHJcblx0Ly8gICAgIHVwZGF0ZUNoYXQoKTtcclxuXHQvLyB9XHJcblx0Y2hhbmdlVXNlcm5hbWUobmV3VXNlcm5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0bmV3VXNlcm5hbWUgPSBuZXdVc2VybmFtZS5zbGljZSgwLCAzMik7XHJcblx0XHRpZiAoIW5ld1VzZXJuYW1lKSByZXR1cm4gZmFsc2U7XHJcblx0XHRpZiAoIW5ld1VzZXJuYW1lLnRyaW0oKSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0aWYgKG5ld1VzZXJuYW1lID09IHRoaXMudXNlckRhdGEudXNlcm5hbWUpIHJldHVybiBmYWxzZTtcclxuXHRcdHRoaXMuc29ja2V0Py5zZW5kKCcvYXBwL2FjY291bnQvbmFtZScsIHtcclxuXHRcdFx0dXVpZDogdGhpcy51c2VyRGF0YS51dWlkLFxyXG5cdFx0XHRjb250ZW50OiBuZXdVc2VybmFtZSxcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy51c2VyRGF0YS51c2VybmFtZSA9IG5ld1VzZXJuYW1lO1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxufVxyXG5cclxuXHJcbkBHbG9iYWxDb21wb25lbnRcclxuY2xhc3MgRmFpckNoYXRWdWUgZXh0ZW5kcyBWdWVXaXRoUHJvcHMoe1xyXG5cdGNoYXQ6IEZhaXJDaGF0LFxyXG59KSB7XHJcblx0bmV3TWVzc2FnZSA9ICcnO1xyXG5cdGxvYWRpbmcgPSBmYWxzZTtcclxuXHJcblx0bmV3VXNlcm5hbWVNb2RhbE9wZW4gPSBmYWxzZTtcclxuXHRuZXdVc2VybmFtZSA9ICcnO1xyXG5cclxuXHRAVnVlVGVtcGxhdGVcclxuXHRnZXQgX3QoKSB7XHJcblx0XHRsZXQgbWVzc2FnZSA9IHRoaXMuY2hhdC5kYXRhLm1lc3NhZ2VzWzBdO1xyXG5cdFx0cmV0dXJuIGBcclxuXHRcdFx0PENIQVQ+XHJcblx0XHRcdFx0PGEtbGlzdFxyXG5cdFx0XHRcdFx0XHRjbGFzcz1cImZhaXItY2hhdFwiXHJcblx0XHRcdFx0XHRcdDpkYXRhLXNvdXJjZT1cIiR7dGhpcy5jaGF0LmRhdGEubWVzc2FnZXN9XCJcclxuXHRcdFx0XHRcdFx0c2l6ZT1cInNtYWxsXCIgYm9yZGVyZWRcclxuXHRcdFx0XHRcdFx0PlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNoZWFkZXI+XHJcblx0XHRcdFx0XHRcdDxoMj5XZWxjb21lIHRvIHRoZSBDaGFkI3ske3RoaXMuY2hhdC5kYXRhLmN1cnJlbnRDaGF0TnVtYmVyfX0gITwvaDI+XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdFx0PHRlbXBsYXRlICNyZW5kZXJJdGVtPVwieyBpdGVtOiBtZXNzYWdlIH1cIj5cclxuXHRcdFx0XHRcdFx0PGEtbGlzdC1pdGVtPlxyXG5cdFx0XHRcdFx0XHRcdDxhLWNvbW1lbnQ+XHJcblx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2F2YXRhcj48Yj57JHt0aGlzLmFzc2hvbGVNYXJrKG1lc3NhZ2UudGltZXNBc3Nob2xlKX19PC9iPjwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2F1dGhvcj48Yj57JHttZXNzYWdlLnVzZXJuYW1lfX08L2I+PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjY29udGVudD48cD57JHt0aGlzLmh0bWxUb1RleHQobWVzc2FnZS5tZXNzYWdlKX19PC9wPjwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2RhdGV0aW1lPnske21lc3NhZ2UudGltZUNyZWF0ZWR9fTwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0PC9hLWNvbW1lbnQ+XHJcblx0XHRcdFx0XHRcdDwvYS1saXN0LWl0ZW0+XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdDwvYS1saXN0PlxyXG5cdFx0XHRcdDxhLWxpc3RcclxuXHRcdFx0XHRcdFx0Y2xhc3M9XCJmYWlyLWNoYXQtbmV3XCJcclxuXHRcdFx0XHRcdFx0OmRhdGEtc291cmNlPVwiWzFdXCJcclxuXHRcdFx0XHRcdFx0c2l6ZT1cInNtYWxsXCIgYm9yZGVyZWRcclxuXHRcdFx0XHRcdFx0aXRlbS1sYXlvdXQ9XCJ2ZXJ0aWNhbFwiXHJcblxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHQ8dGVtcGxhdGUgI3JlbmRlckl0ZW09XCJ7IGl0ZW06IG1lc3NhZ2UgfVwiPlxyXG5cdFx0XHRcdFx0XHQ8YS1saXN0LWl0ZW0+XHJcblx0XHRcdFx0XHRcdFx0PGEtY29tbWVudD5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjYXZhdGFyPjxiPnske3RoaXMuYXNzaG9sZU1hcmsoMTIzKX19PC9iPjwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0XHQ8dGVtcGxhdGUgI2F1dGhvcj5cclxuXHRcdFx0XHRcdFx0XHRcdFx0eyR7dGhpcy5jaGF0LnVzZXJEYXRhLnVzZXJuYW1lfX1cclxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gQGNsaWNrPVwiY2hhbmdlVXNlcm5hbWVcIj7wn5aJPC9zcGFuPlxyXG5cdFx0XHRcdFx0XHRcdFx0PC90ZW1wbGF0ZT5cclxuXHRcdFx0XHRcdFx0XHRcdDx0ZW1wbGF0ZSAjY29udGVudD5cdFx0XHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdFx0XHRcdDxhLWlucHV0LXNlYXJjaFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0di1tb2RlbDp2YWx1ZT1cIm5ld01lc3NhZ2VcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI9XCJDaGFkIGlzIGxpc3RlbmluZy4uLlwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRAc2VhcmNoPVwic2VuZE1lc3NhZ2VcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0OmxvYWRpbmc9XCIke3RoaXMuY2hhdC5kYXRhLmxvYWRpbmd9XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGVudGVyLWJ1dHRvbj1cIlNlbmRcIlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Lz5cclxuXHRcdFx0XHRcdFx0XHRcdDwvdGVtcGxhdGU+XHJcblx0XHRcdFx0XHRcdFx0PC9hLWNvbW1lbnQ+XHJcblx0XHRcdFx0XHRcdDwvYS1saXN0LWl0ZW0+XHJcblx0XHRcdFx0XHQ8L3RlbXBsYXRlPlxyXG5cdFx0XHRcdDwvYS1saXN0PlxyXG5cdFx0XHRcdDxhLW1vZGFsXHJcblx0XHRcdFx0XHRcdHYtbW9kZWw6dmlzaWJsZT1cIiR7dGhpcy5uZXdVc2VybmFtZU1vZGFsT3Blbn1cIlxyXG5cdFx0XHRcdFx0XHR0aXRsZT1cIldoYXQgc2hhbGwgYmUgeW91ciBuZXcgbmFtZT9cIlxyXG5cdFx0XHRcdFx0XHRAb2s9XCJjb25maXJtTmFtZUNoYW5nZVwiXHJcblx0XHRcdFx0XHRcdD5cclxuXHRcdFx0XHRcdDxhLWlucHV0IGlkPVwibmV3LXVzZXJuYW1lLW1vZGFsLWlucHV0XCIgdi1tb2RlbDp2YWx1ZT1cIm5ld1VzZXJuYW1lXCIgQHByZXNzRW50ZXI9XCJjb25maXJtTmFtZUNoYW5nZVwiIDptYXhsZW5ndGg9XCIzMlwiIC8+XHJcblx0XHRcdFx0PC9hLW1vZGFsPlxyXG5cdFx0XHQ8L0NIQVQ+XHJcblx0XHRgO1xyXG5cdH1cclxuXHRhc3Nob2xlTWFyayhuOiBudW1iZXIpIHtcclxuXHRcdGlmIChuID09IDApIHJldHVybiAnQCc7XHJcblx0XHRjb25zdCBtYXJrcyA9IFtcIkBcIiwgXCLimaBcIiwgXCLimaNcIiwgXCLimaVcIiwgXCLimaZcIl07XHJcblx0XHRyZXR1cm4gbWFya3Nbbl0gfHwgbWFya3MucG9wKCk7XHJcblx0fVxyXG5cdGh0bWxUb1RleHQoczogc3RyaW5nKSB7XHJcblx0XHRsZXQgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcclxuXHRcdGEuaW5uZXJIVE1MID0gcztcclxuXHRcdHJldHVybiBhLmlubmVyVGV4dDtcclxuXHR9XHJcblx0YXN5bmMgc2VuZE1lc3NhZ2UoKSB7XHJcblx0XHR0aGlzLmNoYXQuZGF0YS5sb2FkaW5nID0gdHJ1ZTtcclxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAxMDAwKSk7XHJcblx0XHRsZXQgbGFzdCA9IHRoaXMuY2hhdC5kYXRhLm1lc3NhZ2VzWzBdO1xyXG5cdFx0dGhpcy5jaGF0LnNlbmRNZXNzYWdlKHRoaXMubmV3TWVzc2FnZSk7XHJcblx0fVxyXG5cdGNoYW5nZVVzZXJuYW1lKCkge1xyXG5cdFx0dGhpcy5uZXdVc2VybmFtZSA9IHRoaXMuY2hhdC51c2VyRGF0YS51c2VybmFtZTtcclxuXHRcdHRoaXMubmV3VXNlcm5hbWVNb2RhbE9wZW4gPSB0cnVlO1xyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdGxldCBpbnB1dDogSFRNTElucHV0RWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0I25ldy11c2VybmFtZS1tb2RhbC1pbnB1dCcpITtcclxuXHRcdFx0aW5wdXQ/LmZvY3VzKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblx0Y29uZmlybU5hbWVDaGFuZ2UoKSB7XHJcblx0XHR0aGlzLm5ld1VzZXJuYW1lTW9kYWxPcGVuID0gZmFsc2U7XHJcblx0XHR0aGlzLmNoYXQuY2hhbmdlVXNlcm5hbWUodGhpcy5uZXdVc2VybmFtZSk7XHJcblx0fVxyXG59Il19