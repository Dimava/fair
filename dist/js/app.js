"use strict";
// https://raw.githack.com/Dimava/fair-client/master/dist/index.html
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let userData = new UserData();
userData.uuid = localStorage.getItem('uuid') || '';
let socket = new FairSocket();
socket.userData = userData;
let chat = new FairChat();
chat.socket = socket;
chat.userData = userData;
let ladder = new FairLadder();
ladder.socket = socket;
ladder.userData = userData;
class AppVue extends VueWithProps({
    chat: FairChat,
    userData: UserData,
    socket: FairSocket,
    ladder: FairLadder,
}) {
    importModalOpened = false;
    newUuid = '';
    showFakeLadder = false;
    get _t() {
        return `
			<APP>
				<a-space>
					<a-button v-if="${!this.socket.state.connected}" 
						:loading="${this.socket.state.connectionRequested}"
						@click="connectSocket"
						> Connect Socket </a-button>
					<a-button v-if="${!this.ladder.state.connected}"
						:disabled="${!this.socket.state.connected}"
						:loading="${this.ladder.state.connectionRequested}"
						@click="connectLadder"
						> Connect Ladder </a-button>
					<a-button v-if="${!this.chat.state.connected && !this.showFakeLadder}"
						:disabled="${!this.socket.state.connected}"
						:loading="${this.chat.state.connectionRequested}"
						@click="connectChat"
						> Connect Chat </a-button>
					<a-button v-if="${!this.chat.state.connected && !this.showFakeLadder}"
						:disabled="${!this.ladder.state.connected}"
						@click="showFakeLadder=true"
						> Ladder debug tools </a-button>
					<a-button v-if="${!this.chat.state.connected && !this.ladder.state.connected}"
						@click="loadFakeLadder"
						> Load fake ladder </a-button>
				</a-space>
				<a-row>
					<a-col :span="14">
						<FairLadderVue v-if="${this.ladder.state.connected}" :ladder="ladder" />
					</a-col>
					<a-col :span="10">
						<FairChatVue v-if="${this.chat.state.connected}" :chat="chat" />

						<LadderTesterVue v-if="${this.showFakeLadder}" :ladder="ladder" />
					</a-col>
				</a-row>
				<a-modal
						v-model:visible="${this.importModalOpened}"
						title="UUID import"
						@ok="confirmUuidImport"
						>
					This client does not support making its own uuids
					<br>
					Please paste your UUID
					<a-input ref="elNewUuidInput" v-model:value="newUuid" @pressEnter="confirmUuidImport" :maxlength="36" />
				</a-modal>

			</APP>
		`;
    }
    mounted() {
        if (!this.userData.uuid) {
            this.importModalOpened = true;
        }
    }
    confirmUuidImport() {
        if (this.newUuid.match(/........-....-....-....-............/)) {
            this.userData.uuid = this.newUuid;
            localStorage.setItem('uuid', this.newUuid);
            this.importModalOpened = false;
            location.reload();
        }
        else {
            this.importModalOpened = true;
        }
    }
    connectSocket() {
        socket.connect();
    }
    connectChat() {
        let chat = Vue.toRaw(this.chat);
        chat.state.connectionRequested = true;
        setTimeout(() => {
            chat.state.connectionRequested = false;
            chat.connect();
        }, 1000);
    }
    connectLadder() {
        let ladder = Vue.toRaw(this.ladder);
        ladder.state.connectionRequested = true;
        setTimeout(() => {
            ladder.state.connectionRequested = false;
            ladder.connect();
        }, 1000);
    }
    loadFakeLadder() {
        let _l = JSON.parse(localStorage.getItem('_ladder'));
        ladder.handleLadderInit(_l);
    }
}
__decorate([
    VueTemplate
], AppVue.prototype, "_t", null);
let app = Vue.createApp(AppVue, {
    socket,
    chat,
    ladder,
    userData,
}).use(VuePropDecoratorAVariation.custom)
    .use(VuePropDecoratorAVariation.known)
    .use(antd);
app.mount('#app');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0VBQW9FOzs7Ozs7O0FBRXBFLElBQUksUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDOUIsUUFBUSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUVuRCxJQUFJLE1BQU0sR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO0FBQzlCLE1BQU0sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0FBRTNCLElBQUksSUFBSSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7QUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFFekIsSUFBSSxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztBQUM5QixNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUN2QixNQUFNLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUczQixNQUFNLE1BQU8sU0FBUSxZQUFZLENBQUM7SUFDakMsSUFBSSxFQUFFLFFBQVE7SUFDZCxRQUFRLEVBQUUsUUFBUTtJQUNsQixNQUFNLEVBQUUsVUFBVTtJQUNsQixNQUFNLEVBQUUsVUFBVTtDQUNsQixDQUFDO0lBQ0QsaUJBQWlCLEdBQUcsS0FBSyxDQUFDO0lBQzFCLE9BQU8sR0FBUyxFQUFFLENBQUM7SUFFbkIsY0FBYyxHQUFHLEtBQUssQ0FBQztJQUV2QixJQUFJLEVBQUU7UUFDTCxPQUFPOzs7dUJBR2MsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTO2tCQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxtQkFBbUI7Ozt1QkFHaEMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxT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QyxDQUFDO0NBQ0Q7QUF4RkE7SUFEQyxXQUFXO2dDQWtEWDtBQXlDRixJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtJQUMvQixNQUFNO0lBQ04sSUFBSTtJQUNKLE1BQU07SUFDTixRQUFRO0NBQ1IsQ0FBQyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLENBQUM7S0FDdkMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQztLQUNyQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDWixHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaHR0cHM6Ly9yYXcuZ2l0aGFjay5jb20vRGltYXZhL2ZhaXItY2xpZW50L21hc3Rlci9kaXN0L2luZGV4Lmh0bWxcclxuXHJcbmxldCB1c2VyRGF0YSA9IG5ldyBVc2VyRGF0YSgpO1xyXG51c2VyRGF0YS51dWlkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3V1aWQnKSB8fCAnJztcclxuXHJcbmxldCBzb2NrZXQgPSBuZXcgRmFpclNvY2tldCgpO1xyXG5zb2NrZXQudXNlckRhdGEgPSB1c2VyRGF0YTtcclxuXHJcbmxldCBjaGF0ID0gbmV3IEZhaXJDaGF0KCk7XHJcbmNoYXQuc29ja2V0ID0gc29ja2V0O1xyXG5jaGF0LnVzZXJEYXRhID0gdXNlckRhdGE7XHJcblxyXG5sZXQgbGFkZGVyID0gbmV3IEZhaXJMYWRkZXIoKTtcclxubGFkZGVyLnNvY2tldCA9IHNvY2tldDtcclxubGFkZGVyLnVzZXJEYXRhID0gdXNlckRhdGE7XHJcblxyXG5cclxuY2xhc3MgQXBwVnVlIGV4dGVuZHMgVnVlV2l0aFByb3BzKHtcclxuXHRjaGF0OiBGYWlyQ2hhdCxcclxuXHR1c2VyRGF0YTogVXNlckRhdGEsXHJcblx0c29ja2V0OiBGYWlyU29ja2V0LFxyXG5cdGxhZGRlcjogRmFpckxhZGRlcixcclxufSkge1xyXG5cdGltcG9ydE1vZGFsT3BlbmVkID0gZmFsc2U7XHJcblx0bmV3VXVpZDogdXVpZCA9ICcnO1xyXG5cclxuXHRzaG93RmFrZUxhZGRlciA9IGZhbHNlO1xyXG5cdEBWdWVUZW1wbGF0ZVxyXG5cdGdldCBfdCgpIHtcclxuXHRcdHJldHVybiBgXHJcblx0XHRcdDxBUFA+XHJcblx0XHRcdFx0PGEtc3BhY2U+XHJcblx0XHRcdFx0XHQ8YS1idXR0b24gdi1pZj1cIiR7IXRoaXMuc29ja2V0LnN0YXRlLmNvbm5lY3RlZH1cIiBcclxuXHRcdFx0XHRcdFx0OmxvYWRpbmc9XCIke3RoaXMuc29ja2V0LnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWR9XCJcclxuXHRcdFx0XHRcdFx0QGNsaWNrPVwiY29ubmVjdFNvY2tldFwiXHJcblx0XHRcdFx0XHRcdD4gQ29ubmVjdCBTb2NrZXQgPC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRcdDxhLWJ1dHRvbiB2LWlmPVwiJHshdGhpcy5sYWRkZXIuc3RhdGUuY29ubmVjdGVkfVwiXHJcblx0XHRcdFx0XHRcdDpkaXNhYmxlZD1cIiR7IXRoaXMuc29ja2V0LnN0YXRlLmNvbm5lY3RlZH1cIlxyXG5cdFx0XHRcdFx0XHQ6bG9hZGluZz1cIiR7dGhpcy5sYWRkZXIuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZH1cIlxyXG5cdFx0XHRcdFx0XHRAY2xpY2s9XCJjb25uZWN0TGFkZGVyXCJcclxuXHRcdFx0XHRcdFx0PiBDb25uZWN0IExhZGRlciA8L2EtYnV0dG9uPlxyXG5cdFx0XHRcdFx0PGEtYnV0dG9uIHYtaWY9XCIkeyF0aGlzLmNoYXQuc3RhdGUuY29ubmVjdGVkICYmICF0aGlzLnNob3dGYWtlTGFkZGVyfVwiXHJcblx0XHRcdFx0XHRcdDpkaXNhYmxlZD1cIiR7IXRoaXMuc29ja2V0LnN0YXRlLmNvbm5lY3RlZH1cIlxyXG5cdFx0XHRcdFx0XHQ6bG9hZGluZz1cIiR7dGhpcy5jaGF0LnN0YXRlLmNvbm5lY3Rpb25SZXF1ZXN0ZWR9XCJcclxuXHRcdFx0XHRcdFx0QGNsaWNrPVwiY29ubmVjdENoYXRcIlxyXG5cdFx0XHRcdFx0XHQ+IENvbm5lY3QgQ2hhdCA8L2EtYnV0dG9uPlxyXG5cdFx0XHRcdFx0PGEtYnV0dG9uIHYtaWY9XCIkeyF0aGlzLmNoYXQuc3RhdGUuY29ubmVjdGVkICYmICF0aGlzLnNob3dGYWtlTGFkZGVyfVwiXHJcblx0XHRcdFx0XHRcdDpkaXNhYmxlZD1cIiR7IXRoaXMubGFkZGVyLnN0YXRlLmNvbm5lY3RlZH1cIlxyXG5cdFx0XHRcdFx0XHRAY2xpY2s9XCJzaG93RmFrZUxhZGRlcj10cnVlXCJcclxuXHRcdFx0XHRcdFx0PiBMYWRkZXIgZGVidWcgdG9vbHMgPC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRcdDxhLWJ1dHRvbiB2LWlmPVwiJHshdGhpcy5jaGF0LnN0YXRlLmNvbm5lY3RlZCAmJiAhdGhpcy5sYWRkZXIuc3RhdGUuY29ubmVjdGVkfVwiXHJcblx0XHRcdFx0XHRcdEBjbGljaz1cImxvYWRGYWtlTGFkZGVyXCJcclxuXHRcdFx0XHRcdFx0PiBMb2FkIGZha2UgbGFkZGVyIDwvYS1idXR0b24+XHJcblx0XHRcdFx0PC9hLXNwYWNlPlxyXG5cdFx0XHRcdDxhLXJvdz5cclxuXHRcdFx0XHRcdDxhLWNvbCA6c3Bhbj1cIjE0XCI+XHJcblx0XHRcdFx0XHRcdDxGYWlyTGFkZGVyVnVlIHYtaWY9XCIke3RoaXMubGFkZGVyLnN0YXRlLmNvbm5lY3RlZH1cIiA6bGFkZGVyPVwibGFkZGVyXCIgLz5cclxuXHRcdFx0XHRcdDwvYS1jb2w+XHJcblx0XHRcdFx0XHQ8YS1jb2wgOnNwYW49XCIxMFwiPlxyXG5cdFx0XHRcdFx0XHQ8RmFpckNoYXRWdWUgdi1pZj1cIiR7dGhpcy5jaGF0LnN0YXRlLmNvbm5lY3RlZH1cIiA6Y2hhdD1cImNoYXRcIiAvPlxyXG5cclxuXHRcdFx0XHRcdFx0PExhZGRlclRlc3RlclZ1ZSB2LWlmPVwiJHt0aGlzLnNob3dGYWtlTGFkZGVyfVwiIDpsYWRkZXI9XCJsYWRkZXJcIiAvPlxyXG5cdFx0XHRcdFx0PC9hLWNvbD5cclxuXHRcdFx0XHQ8L2Etcm93PlxyXG5cdFx0XHRcdDxhLW1vZGFsXHJcblx0XHRcdFx0XHRcdHYtbW9kZWw6dmlzaWJsZT1cIiR7dGhpcy5pbXBvcnRNb2RhbE9wZW5lZH1cIlxyXG5cdFx0XHRcdFx0XHR0aXRsZT1cIlVVSUQgaW1wb3J0XCJcclxuXHRcdFx0XHRcdFx0QG9rPVwiY29uZmlybVV1aWRJbXBvcnRcIlxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHRUaGlzIGNsaWVudCBkb2VzIG5vdCBzdXBwb3J0IG1ha2luZyBpdHMgb3duIHV1aWRzXHJcblx0XHRcdFx0XHQ8YnI+XHJcblx0XHRcdFx0XHRQbGVhc2UgcGFzdGUgeW91ciBVVUlEXHJcblx0XHRcdFx0XHQ8YS1pbnB1dCByZWY9XCJlbE5ld1V1aWRJbnB1dFwiIHYtbW9kZWw6dmFsdWU9XCJuZXdVdWlkXCIgQHByZXNzRW50ZXI9XCJjb25maXJtVXVpZEltcG9ydFwiIDptYXhsZW5ndGg9XCIzNlwiIC8+XHJcblx0XHRcdFx0PC9hLW1vZGFsPlxyXG5cclxuXHRcdFx0PC9BUFA+XHJcblx0XHRgO1xyXG5cdH1cclxuXHRtb3VudGVkKCkge1xyXG5cdFx0aWYgKCF0aGlzLnVzZXJEYXRhLnV1aWQpIHtcclxuXHRcdFx0dGhpcy5pbXBvcnRNb2RhbE9wZW5lZCA9IHRydWU7XHJcblx0XHR9XHJcblx0fVxyXG5cdGNvbmZpcm1VdWlkSW1wb3J0KCkge1xyXG5cdFx0aWYgKHRoaXMubmV3VXVpZC5tYXRjaCgvLi4uLi4uLi4tLi4uLi0uLi4uLS4uLi4tLi4uLi4uLi4uLi4uLykpIHtcclxuXHRcdFx0dGhpcy51c2VyRGF0YS51dWlkID0gdGhpcy5uZXdVdWlkO1xyXG5cdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndXVpZCcsIHRoaXMubmV3VXVpZCk7XHJcblx0XHRcdHRoaXMuaW1wb3J0TW9kYWxPcGVuZWQgPSBmYWxzZTtcclxuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmltcG9ydE1vZGFsT3BlbmVkID0gdHJ1ZTtcclxuXHRcdH1cclxuXHR9XHJcblx0Y29ubmVjdFNvY2tldCgpIHtcclxuXHRcdHNvY2tldC5jb25uZWN0KCk7XHJcblx0fVxyXG5cdGNvbm5lY3RDaGF0KCkge1xyXG5cdFx0bGV0IGNoYXQgPSBWdWUudG9SYXcodGhpcy5jaGF0KTtcclxuXHRcdGNoYXQuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IHRydWU7XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0Y2hhdC5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gZmFsc2U7XHJcblx0XHRcdGNoYXQuY29ubmVjdCgpO1xyXG5cdFx0fSwgMTAwMCk7XHJcblx0fVxyXG5cdGNvbm5lY3RMYWRkZXIoKSB7XHJcblx0XHRsZXQgbGFkZGVyID0gVnVlLnRvUmF3KHRoaXMubGFkZGVyKTtcclxuXHRcdGxhZGRlci5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gdHJ1ZTtcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRsYWRkZXIuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IGZhbHNlO1xyXG5cdFx0XHRsYWRkZXIuY29ubmVjdCgpO1xyXG5cdFx0fSwgMTAwMCk7XHJcblx0fVxyXG5cdGxvYWRGYWtlTGFkZGVyKCkge1xyXG5cdFx0bGV0IF9sID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnX2xhZGRlcicpISk7XHJcblx0XHRsYWRkZXIuaGFuZGxlTGFkZGVySW5pdChfbCBhcyBhbnkpO1xyXG5cdH1cclxufVxyXG5cclxubGV0IGFwcCA9IFZ1ZS5jcmVhdGVBcHAoQXBwVnVlLCB7XHJcblx0c29ja2V0LFxyXG5cdGNoYXQsXHJcblx0bGFkZGVyLFxyXG5cdHVzZXJEYXRhLFxyXG59KS51c2UoVnVlUHJvcERlY29yYXRvckFWYXJpYXRpb24uY3VzdG9tKVxyXG5cdC51c2UoVnVlUHJvcERlY29yYXRvckFWYXJpYXRpb24ua25vd24pXHJcblx0LnVzZShhbnRkKTtcclxuYXBwLm1vdW50KCcjYXBwJyk7XHJcbiJdfQ==