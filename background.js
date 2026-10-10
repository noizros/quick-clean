const DEFAULTS = {history:true,cache:true,cacheStorage:true,downloads:false,cookies:false,formData:false,indexedDB:false,localStorage:false,serviceWorkers:false,fileSystems:false, since:'all', confirm:false, language:'en'};
const KEYS = ['history','cache','cacheStorage','downloads','cookies','formData','indexedDB','localStorage','serviceWorkers','fileSystems'];
let cleaning = false;
const BADGE_DELAY_MS = 1800;
async function clearBadgeSoon() {
  await chrome.alarms.create('clear-clean-badge', {when: Date.now() + BADGE_DELAY_MS});
}
chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === 'clear-clean-badge') await chrome.action.setBadgeText({text:''});
});
async function clean() {
  if (cleaning) return;
  const s = {...DEFAULTS,...await chrome.storage.local.get(DEFAULTS)};
  const selected = Object.fromEntries(KEYS.filter(k => s[k]).map(k=>[k,true]));
  if (!Object.keys(selected).length) {await chrome.action.setBadgeText({text:'—'});await clearBadgeSoon();return;}
  if(s.confirm){await chrome.runtime.openOptionsPage();return;}
  cleaning = true;
  await chrome.action.setBadgeBackgroundColor({color:'#9146ff'});
  await chrome.action.setBadgeText({text:'…'});
  try {
    const periods={all:0,hour:3600000,day:86400000,week:604800000,month:2592000000};
    const since = s.since==='all'?0:Date.now()-(periods[s.since]??0);
    await chrome.browsingData.remove({since,originTypes:{unprotectedWeb:true}},selected);
    await chrome.action.setBadgeBackgroundColor({color:'#23885d'});
    await chrome.action.setBadgeText({text:'✓'});
    await chrome.storage.local.set({lastClean:Date.now(),lastResult:'ok'});
  } catch(e) {
    await chrome.action.setBadgeBackgroundColor({color:'#c43b55'});
    await chrome.action.setBadgeText({text:'!'});
    await chrome.storage.local.set({lastResult:String(e)});
  } finally {cleaning=false;await clearBadgeSoon();}
}
chrome.action.onClicked.addListener(clean);
chrome.runtime.onInstalled.addListener(async()=>{
  const existing=await chrome.storage.local.get(null);
  const missing=Object.fromEntries(Object.entries(DEFAULTS).filter(([k])=>!(k in existing)));
  if(Object.keys(missing).length)await chrome.storage.local.set(missing);
  chrome.contextMenus.create({id:'options',title:'Options / Definições',contexts:['action']});
});
chrome.contextMenus.onClicked.addListener((info)=>{if(info.menuItemId==='options')chrome.runtime.openOptionsPage();});
