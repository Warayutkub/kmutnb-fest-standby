(function () {
  "use strict";

  var cfg = window.STANDBY_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var shops = []; // [{ no, name, key }]

  /* ---------- ข้อความจาก config ---------- */
  document.querySelectorAll("[data-bind]").forEach(function (el) {
    var v = cfg[el.getAttribute("data-bind")];
    if (v) el.textContent = v;
  });

  /* ---------- ใบปลิว ---------- */
  var tpl = $("flyerTpl");
  document.querySelectorAll(".flyer").forEach(function (f) {
    f.appendChild(tpl.content.cloneNode(true));
    f.querySelectorAll("[data-link]").forEach(function (a) {
      a.href = a.getAttribute("data-link") === "ig" ? cfg.instagramUrl : cfg.facebookUrl;
    });
  });

  /* ---------- ช่วยเหลือ ---------- */
  // ตัดช่องว่าง/zero-width/ตัวพิมพ์ เพื่อให้ค้นเจอง่าย
  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFC")
      .replace(/[\s​‌‍﻿.,'"“”‘’\-_]/g, "");
  }

  // ตัวอ่าน CSV (รองรับ "ข้อความ, ที่มีจุลภาค" และขึ้นบรรทัดใหม่ในเซลล์)
  function parseCsv(text) {
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim() !== ""; }); });
  }

  // Google Form timestamp เช่น "15/11/2026, 18:20:11" หรือ "11/15/2026 18:20:11"
  function parseStamp(s) {
    var m = String(s).match(/(\d{1,4})[\/-](\d{1,2})[\/-](\d{1,4})[ ,T]*(\d{1,2})?:?(\d{2})?:?(\d{2})?/);
    if (!m) return 0;
    var a = +m[1], b = +m[2], y = +m[3], d, mo;
    if (a > 999) { y = a; mo = b; d = +m[3]; }       // yyyy-mm-dd
    else if (a > 12) { d = a; mo = b; }               // dd/mm/yyyy
    else if (b > 12) { mo = a; d = b; }               // mm/dd/yyyy
    else { d = a; mo = b; }                           // กำกวม → ถือเป็น dd/mm (โลแคลไทย)
    if (y > 2400) y -= 543;                           // พ.ศ. → ค.ศ.
    return new Date(y, mo - 1, d, +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
  }

  function fromSheet(rows) {
    var head = rows[0].map(function (h) { return h.trim(); });
    var col = cfg.columns || {};
    var iName = head.indexOf(col.shopName);
    var iTime = head.indexOf(col.timestamp);
    var iStatus = head.indexOf(col.status);
    if (iName < 0) throw new Error('ไม่พบคอลัมน์ "' + col.shopName + '" ในชีต');

    var list = rows.slice(1).map(function (r, idx) {
      return {
        name: (r[iName] || "").trim(),
        t: iTime >= 0 ? parseStamp(r[iTime]) : idx,
        idx: idx,
        status: iStatus >= 0 ? (r[iStatus] || "").trim() : "",
      };
    }).filter(function (s) { return s.name; });

    var useStatus = iStatus >= 0 && list.some(function (s) { return s.status; });
    if (useStatus) list = list.filter(function (s) { return s.status === cfg.standbyStatusValue; });

    list.sort(function (a, b) { return a.t - b.t || a.idx - b.idx; });
    return list.map(function (s) { return s.name; });
  }

  function loadNames() {
    if (!cfg.sheetCsvUrl) return Promise.resolve((window.MOCK_SHOPS || []).slice());
    var url = cfg.sheetCsvUrl + (cfg.sheetCsvUrl.indexOf("?") < 0 ? "?" : "&") + "_=" + Date.now();
    return fetch(url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(function (t) { return fromSheet(parseCsv(t)); });
  }

  /* ---------- สถานะประกาศ ---------- */
  function isAnnounced() {
    var p = new URLSearchParams(location.search).get("state");
    if (p === "pending") return false;
    if (p === "announced") return true;
    if (!cfg.sheetCsvUrl) return true; // โหมดข้อมูลจำลอง: แสดงรายชื่อเลย
    var t = Date.parse(cfg.announceAt);
    return isNaN(t) || Date.now() >= t;
  }

  /* ---------- วาดตาราง ---------- */
  function renderRows() {
    var tbody = $("rows");
    tbody.innerHTML = "";
    var frag = document.createDocumentFragment();
    shops.forEach(function (s) {
      var tr = document.createElement("tr");
      tr.id = "shop-" + s.no;
      tr.style.setProperty("--i", Math.min(s.no - 1, 20)); // ไล่แถวทีละนิด (เพดาน 20 แถว)
      var no = document.createElement("td");
      no.className = "c-no";
      no.textContent = s.no;
      var nm = document.createElement("td");
      nm.className = "c-name";
      var span = document.createElement("span");
      span.className = "hl";
      span.textContent = s.name;
      nm.appendChild(span);
      tr.appendChild(no);
      tr.appendChild(nm);
      frag.appendChild(tr);
      s.row = tr;
    });
    tbody.appendChild(frag);
    $("count").textContent = shops.length;
  }

  /* ---------- ค้นหา ---------- */
  var input = $("search"), clearBtn = $("clear");
  var current = null;

  function search(raw) {
    var q = normalize(raw);
    clearBtn.hidden = !raw;
    shops.forEach(function (s) { s.row && s.row.classList.remove("hit"); });
    $("noteFound").hidden = true;
    $("noteMiss").hidden = true;
    current = null;
    if (!q) return;

    var hits = shops.filter(function (s) { return s.key.indexOf(q) >= 0; });
    if (!hits.length) {
      $("missTitle").textContent = "ไม่พบ “" + raw.trim() + "” ในประกาศนี้";
      $("noteMiss").hidden = false;
      return;
    }
    // ชื่อที่ตรงเป๊ะมาก่อน
    hits.sort(function (a, b) { return (b.key === q) - (a.key === q) || a.no - b.no; });
    current = hits[0];
    hits.forEach(function (s) { s.row.classList.add("hit"); });

    $("foundNo").textContent = current.no;
    $("foundName").textContent = current.name;
    $("foundAhead").textContent = current.no === 1
      ? "เป็นร้านแรกในคิวสำรอง"
      : "มีร้านรอก่อนหน้า " + (current.no - 1) + " ร้าน";
    var more = $("foundMore");
    more.hidden = hits.length < 2;
    if (hits.length > 1) {
      more.textContent = "พบชื่อที่ใกล้เคียงอีก " + (hits.length - 1) + " ร้าน: " +
        hits.slice(1, 4).map(function (s) { return s.no + ". " + s.name; }).join(", ") +
        (hits.length > 4 ? " …" : "");
    }
    $("noteFound").hidden = false;
  }

  var timer;
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      search(input.value);
      var u = new URL(location.href);
      if (input.value.trim()) u.searchParams.set("q", input.value.trim());
      else u.searchParams.delete("q");
      history.replaceState(null, "", u);
    }, 150);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); jump(); }
  });
  clearBtn.addEventListener("click", function () {
    input.value = "";
    input.dispatchEvent(new Event("input"));
    input.focus();
  });

  function jump() {
    if (!current) return;
    var r = current.row;
    r.scrollIntoView({ block: "center" });
    r.classList.remove("flash");
    void r.offsetWidth;
    r.classList.add("flash");
  }
  $("jump").addEventListener("click", jump);

  // ประทับตราองค์การเมื่อเลื่อนลงมาเห็น
  function watchSeal() {
    var seal = document.querySelector(".seal");
    if (!seal) return;
    if (!("IntersectionObserver" in window)) { seal.classList.add("in-view"); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { seal.classList.add("in-view"); io.disconnect(); }
    }, { threshold: 0.6 });
    io.observe(seal);
  }

  /* ---------- เริ่มต้น ---------- */
  if (!isAnnounced()) {
    document.body.classList.add("is-pending");
    $("loading").hidden = true;
    $("pending").hidden = false;
    return;
  }

  var t0 = performance.now();
  document.body.classList.add("intro");
  setTimeout(function () { document.body.classList.remove("intro"); }, 2500);
  loadNames().then(function (names) {
    // ถ้าโหลดจากชีตช้า อนิเมชั่นเปิดจบไปแล้ว → ให้แถวขึ้นทันทีไม่ต้องรอดีเลย์
    if (performance.now() - t0 > 800) document.body.classList.add("late-data");
    shops =names.map(function (n, i) { return { no: i + 1, name: n, key: normalize(n) }; });
    renderRows();
    $("loading").hidden = true;
    $("announced").hidden = false;
    watchSeal();
    var q = new URLSearchParams(location.search).get("q");
    if (q) { input.value = q; search(q); }
  }).catch(function (err) {
    console.error(err);
    $("loading").hidden = true;
    $("error").hidden = false;
  });
})();
