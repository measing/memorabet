const fs = require('fs');
const path = require('path');

function usage(){
  console.log('Uso: node tools/restaurar-rankings-desde-export.js export-firebase.json');
  console.log('Genera rankingCups-restaurado.json y rankingMedals-restaurado.json junto al export.');
}

function readJson(filePath){
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data){
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function safeName(profile = {}){
  const raw = String(profile.nickname || profile.user || profile.name || profile.email || 'Jugador').trim();
  const name = raw.length > 20 ? raw.slice(0, 20) : raw;
  return name.length >= 3 ? name : 'Jugador';
}

function safeAvatar(profile = {}){
  const avatar = String(profile.avatar || '');
  return avatar.length <= 120 ? avatar : '';
}

function numberValue(...values){
  for(const value of values){
    const number = Number(value);
    if(Number.isFinite(number)) return number;
  }
  return 0;
}

function normalizeExistingRanking(ranking = {}){
  if(!ranking || typeof ranking !== 'object' || Array.isArray(ranking)) return {};
  return Object.entries(ranking).reduce((acc, [uid, entry]) => {
    if(!entry || typeof entry !== 'object') return acc;
    const user = safeName(entry);
    const cups = numberValue(entry.cups, entry.goldCups, entry.medals, entry.silverCups, entry.trophies);
    if(uid && cups > 0){
      acc[uid] = {
        uid:String(entry.uid || uid),
        user,
        avatar:safeAvatar(entry),
        cups,
        t:numberValue(entry.t, Date.now())
      };
    }
    return acc;
  }, {});
}

function upsertAward(ranking, uid, profile, cups){
  if(!uid || cups <= 0) return false;
  const current = ranking[uid];
  if(current && numberValue(current.cups) >= cups) return false;
  ranking[uid] = {
    uid,
    user:safeName(profile),
    avatar:safeAvatar(profile),
    cups,
    t:numberValue(profile.updatedAt, profile.createdAt, Date.now())
  };
  return true;
}

function main(){
  const inputPath = process.argv[2];
  if(!inputPath){
    usage();
    process.exit(1);
  }

  const root = readJson(inputPath);
  const users = root.users && typeof root.users === 'object' ? root.users : {};
  const rankingCups = normalizeExistingRanking(root.rankingCups);
  const rankingMedals = normalizeExistingRanking(root.rankingMedals);
  let restoredCups = 0;
  let restoredMedals = 0;

  for(const [uid, profile] of Object.entries(users)){
    if(!profile || typeof profile !== 'object') continue;
    const cups = numberValue(profile.cups, profile.goldCups);
    const medals = numberValue(profile.medals, profile.silverCups);
    if(upsertAward(rankingCups, uid, profile, cups)) restoredCups += 1;
    if(upsertAward(rankingMedals, uid, profile, medals)) restoredMedals += 1;
  }

  const outDir = path.dirname(path.resolve(inputPath));
  const cupsPath = path.join(outDir, 'rankingCups-restaurado.json');
  const medalsPath = path.join(outDir, 'rankingMedals-restaurado.json');
  writeJson(cupsPath, rankingCups);
  writeJson(medalsPath, rankingMedals);

  console.log(`Usuarios revisados: ${Object.keys(users).length}`);
  console.log(`Entradas nuevas/actualizadas en rankingCups: ${restoredCups}`);
  console.log(`Entradas nuevas/actualizadas en rankingMedals: ${restoredMedals}`);
  console.log(`Archivo Memoria: ${cupsPath}`);
  console.log(`Archivo Pares: ${medalsPath}`);
  console.log('Importa cada archivo solo dentro de su nodo correspondiente, nunca en la raiz.');
}

main();
