class ServerList {
  constructor() {
    this.servers = [];
    this.server_list_reorder_requested = false;

    this.default_reconnect_delay_ms = 5_000; // 5 seconds
    this.max_reconnect_delay_ms = 1_000 * 60 * 3; // 3 minutes
    this.reconnect_delay_ms = 0;

    this.host_element = document.querySelector("#host");
    this.dialog_element = document.querySelector("dialog");

    this.setup_websocket();

    this.setup_dialog();

    setInterval(this.update.bind(this), 1_000);

    window.addEventListener("popstate", (event) => {
      console.log(event);

      event.preventDefault();
      event.stopPropagation();

      if (this.dialog_element.open)
        this.dialog_element.close();
    });
  }

  setup_websocket() {
    this.websocket = new WebSocket("wss://gsh.w3d.cyberarm.dev/api/websocket");

    this.websocket.addEventListener("open", (event) => {
      this.reconnect_delay_ms = 0;

      // Send handshake
      this.websocket.send("{ \"protocol_version\": 1 }");
    });

    this.websocket.addEventListener("message", (event) => {
      this.handle_websocket(event);
    });

    this.websocket.addEventListener("close", (event) => {
      if (this.reconnect_delay_ms === 0) {
        this.reconnect_delay_ms = this.default_reconnect_delay_ms;
      } else {
        this.reconnect_delay_ms *= 2;
        if (this.reconnect_delay_ms > this.max_reconnect_delay_ms) {
          this.reconnect_delay_ms = this.max_reconnect_delay_ms;
        }
      }

      setTimeout(this.setup_websocket(), this.reconnect_delay_ms);
    });
  }

  setup_dialog() {
    this.dialog_element.addEventListener("command", (event) => {
      console.log(event);
    });
  }

  update() {
    if (this.server_list_reorder_requested) {
      this.server_list_reorder_requested = false;

      [...this.host_element.children].sort((a, b) => {
        let element_a = a.querySelector("[data-players]")
        let element_b = b.querySelector("[data-players]")

        return parseInt(element_a.dataset["players"]) < parseInt(element_b.dataset["players"]);
      }).forEach((child) => {
        this.host_element.appendChild(child);
      });
    }
  }

  handle_websocket(event) {
    let data = JSON.parse(event.data);

    switch (data.type) {
      case "ping": {
        this.websocket.send('{ "type": "pong", "data": "" }')

        break;
      }

      case "server_list": {
        this.host_element.innerHTML = "";
        data.data.sort((a, b) => { return a.status.numplayers < b.status.numplayers }).forEach((hash) => {
          this.add_server_item(hash);
        });

        this.servers = data.data;
        break;
      }

      case "server_added":
      case "server_updated": {
        let server = this.servers.find((s) => { return s.id == data.data.id });
        if (server) {
          this.servers[this.servers.indexOf(server)] = data.data;
        } else {
          this.servers.push(data.data);
        }

        this.update_server_item(data.data);
        break;
      }

      case "server_removed": {
        let server = this.servers.find((s) => { return s.id == data.data.id });
        if (server) {
          this.servers.splice(this.servers.indexOf(server), 1);
        }

        this.remove_server_item(data.data);
        break;
      }

      default: {
        console.log("Unhandled event", data.type);

        break;
      }
    }
  }

  add_server_item(hash) {
    let card = document.createElement("div");
    card.classList.add("card", "server-row", "row", "server-item");
    card.dataset["uuid"] = hash.id;
    card.onclick = (event) => {
      // console.log(event);

      let server = this.servers.find((s) => { return s.id == hash.id });

      history.pushState({}, "Dialog", "?dialog=1");
      this.dialog_element.show();
      this.dialog_populate_server_data(server);
    }

    let app_icon = document.createElement("img");
    app_icon.classList.add("icon");
    app_icon.srcset = `/media/images/${hash.game}/icon.webp`;
    app_icon.dataset["icon"] = hash.game;

    let server_info = document.createElement("div");
    server_info.classList.add("grow", "clip-text");
    let server_info_label = document.createElement("strong");
    server_info_label.dataset["name"] = hash.status.name;
    server_info_label.innerText = hash.status.name;
    let server_info_value = document.createElement("p");
    server_info_value.dataset["map"] = hash.status.map;
    server_info_value.innerText = hash.status.map;
    server_info.appendChild(server_info_label);
    server_info.appendChild(server_info_value);

    let player_info = document.createElement("div");
    let player_info_label = document.createElement("strong");
    player_info_label.innerText = "Players";
    let player_info_value = document.createElement("p");
    player_info_value.dataset["players"] = `${hash.status.numplayers}`;
    player_info_value.dataset["max_players"] = `${hash.status.maxplayers}`;
    player_info_value.innerText = `${hash.status.numplayers}/${hash.status.maxplayers}`;
    player_info.appendChild(player_info_label);
    player_info.appendChild(player_info_value);

    card.appendChild(app_icon);
    card.appendChild(server_info);
    card.appendChild(player_info);

    this.host_element.appendChild(card);
  }

  update_server_item(hash) {
    let element = this.host_element.querySelector(`[data-uuid="${hash.id}"`);
    if (!element) {
      this.add_server_item(hash)
      return;
    }

    // Update ICON
    let app_icon = element.querySelector('[data-icon]');
    if (app_icon.dataset["icon"] !== hash.game) {
      app_icon.dataset["icon"] = hash.game;
      app_icon.srcset = `/media/images/${hash.game}/icon.webp`;
    }

    // Update NAME
    let server_info_label = element.querySelector('[data-name]');
    if (server_info_label.dataset["name"] !== hash.status.name) {
      app_icon.dataset["name"] = hash.status.name;
      app_icon.innerText = hash.status.name;
    }

    // Update MAP
    let server_info_value = element.querySelector('[data-map]');
    if (server_info_value.dataset["map"] !== hash.status.map) {
      server_info_value.dataset["map"] = hash.status.map;
      server_info_value.innerText = hash.status.map;
    }

    // Update PLAYERS
    let player_info_value = element.querySelector('[data-players]');
    if (player_info_value.dataset["players"] !== `${hash.status.numplayers}`) {
      this.server_list_reorder_requested = true;

      player_info_value.dataset["players"] = `${hash.status.numplayers}`;
      player_info_value.innerText = `${hash.status.numplayers}/${hash.status.maxplayers}`;
    }
  }

  remove_server_item(hash) {
    let card = this.host_element.querySelector(`[data-uuid="${hash.id}"]`)
    if (card) {
      this.host_element.removeChild(card);
    }
  }

  dialog_populate_server_data(server) {
    // console.log(server);

    // Set dialog background banner image to match app
    this.dialog_element.style.backgroundImage = `url("/media/images/${server.game}/banner.webp")`;

    // Set server information
    this.dialog_element.querySelector("#server-name").innerText = server.status.name;
    this.dialog_element.querySelector("#server-map").innerText = server.status.map;
    this.dialog_element.querySelector("#server-next-map").innerText = server.status.nextmap;
    this.dialog_element.querySelector("#server-region").innerText = server.region;
    // this.dialog_element.querySelector("#server-ping").innerText = server.status.name;
    this.dialog_element.querySelector("#server-time").innerText = this.server_time_elapsed(server.status.started);
    this.dialog_element.querySelector("#server-channel").innerText = server.channel;
    this.dialog_element.querySelector("#server-players").innerText = `${server.status.numplayers}/${server.status.maxplayers}`;
    this.dialog_element.querySelector("#server-time-left").innerText = this.server_time_remaining(server.status.estimatedEndTime);
    this.dialog_element.querySelector("#server-version").innerText = server.version;

    // Clear out any old data
    let host = this.dialog_element.querySelector("#dialog-teams");
    host.innerHTML = "";

    // Add team rosters
    server.status.teams.forEach((team) => {
      let players = server.status.players.filter((player) => { return player.team == team.id });
      if ((team.id < 0 || team.id > 1) && players.length <= 0) {
        // skip non-standard teams that are empty.
      } else {
        this.add_faction_roster(server, team, players);
      }
    });
  }

  add_faction_roster(server, team, players) {
    let host = this.dialog_element.querySelector("#dialog-teams");

    // console.log(team, players);

    let card = document.createElement("div");
    card.classList.add("card", "team-card", `faction-${server.game}-${team.name.toLowerCase()}`);

    let team_row = document.createElement("div");
    team_row.classList.add("row", "server-row", "faction-row");
    let faction_icon = document.createElement("img");
    faction_icon.classList.add("icon");
    faction_icon.src = `/media/images/factions/faction_${server.game}_${team.name.toLowerCase()}.webp`;
    let faction_name = document.createElement("strong");
    faction_name.innerText = team.name;
    team_row.appendChild(faction_icon);
    team_row.appendChild(faction_name);
    card.append(team_row);

    let team_stats = document.createElement("div");
    team_stats.classList.add("row", "server-row");
    ["Score", "Kills", "Deaths", "Players"].forEach((v) => {
      let container = document.createElement("div");
      container.classList.add("column");
      if (v.toLowerCase() !== "players")
        container.classList.add("grow");
      let title = document.createElement("strong");
      title.innerText = v;
      let value = document.createElement("p");
      if (v.toLowerCase() !== "players")
        value.innerText = team[v.toLowerCase()];
      else
        value.innerText = `${players.length}/${server.status.maxplayers}`;

      container.appendChild(title);
      container.appendChild(value);
      team_stats.appendChild(container);
    });
    card.appendChild(team_stats);

    if (players.length > 0) {
      // Horizontal separator
      let hr = document.createElement("hr");
      card.appendChild(hr);

      let roster = document.createElement("div");
      roster.classList.add("roster-grid");
      let fields = ["Name", "Score", "Kills", "Deaths", "Ping", "Time"];
      // Labels
      fields.forEach((v) => {
        let title = document.createElement("strong");
        title.innerText = v;
        roster.appendChild(title);
      });

      // Players
      players.sort((a, b) => { return a.score < b.score }).forEach((player) => {
        fields.forEach((v) => {
          let value = document.createElement("p");
          value.classList.add("clip-text");
          if (v.toLowerCase() === "name")
            value.innerText = player.nick;
          else
            value.innerText = player[v.toLowerCase()];

          roster.appendChild(value);
        });
      });

      card.appendChild(roster);
    }

    host.appendChild(card);
  }

  server_time_elapsed(time) {
    let elapsed_seconds = (Date.now() - Date.parse(time)) / 1000;

    let hours = Math.floor(elapsed_seconds / 60.0 / 60.0) % 100;
    let minutes = Math.floor(elapsed_seconds / 60.0) % 60;
    let seconds = Math.floor(elapsed_seconds) % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  server_time_remaining(time) {
    if (time === null)
      return "∞";

    let remaining_seconds = (Date.parse(time) - Date.now()) / 1000;
    if (remaining_seconds < 0)
      remaining_seconds = 0;

    let hours = Math.floor(remaining_seconds / 60.0 / 60.0) % 100;
    let minutes = Math.floor(remaining_seconds / 60.0) % 60;
    let seconds = Math.floor(remaining_seconds) % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
};

window.addEventListener("load", (e) => {
  new ServerList();
});
