// app/api/v1/ml/insights/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getAuthUser } from '@/lib/auth/serverAuth';

function mean(a: number[]) { return a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0; }
function stdDev(a: number[]) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s,v)=>s+Math.pow(v-m,2),0)/a.length);
}
function slope(a: number[]) {
  const n = a.length; if (n < 2) return 0;
  const xi = Array.from({length:n},(_,i)=>i);
  const mx=mean(xi), my=mean(a);
  const num=xi.reduce((s,x,i)=>s+(x-mx)*(a[i]-my),0);
  const den=xi.reduce((s,x)=>s+Math.pow(x-mx,2),0);
  return den===0?0:num/den;
}
function predictNext(vals: number[], w=7) {
  if (!vals.length) return 0;
  const win=vals.slice(-w), b=mean(win), t=slope(win);
  return Math.max(0, Math.round(b+t));
}

export async function GET(req: NextRequest) {
  const user = getAuthUser();
  if (!user || !['ADMIN','SUPER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get('days')||'30'), 180);
    const from = new Date(); from.setDate(from.getDate()-days);

    const entries = await prisma.dailyEntry.findMany({
      where: { date: { gte: from } },
      include: { district: { select: { id:true, name:true, code:true, sortOrder:true } } },
      orderBy: { date: 'asc' },
    });

    const districts = await prisma.district.findMany({ orderBy: { sortOrder:'asc' } });
    const byD: Record<string, typeof entries> = {};
    for (const e of entries) {
      if (!byD[e.districtId]) byD[e.districtId]=[];
      byD[e.districtId].push(e);
    }

    const predictions = districts.map(d => {
      const de = byD[d.id]||[];
      const ser = de.map(e=>e.offlineCount);
      const pred = predictNext(ser);
      const tot = de[de.length-1]?.totalCount || 0;
      const t = slope(ser.slice(-7));
      return {
        districtId: d.id, districtName: d.name, districtCode: d.code,
        predictedOffline: pred,
        predictedPct: tot>0?+(pred/tot*100).toFixed(1):0,
        avgOffline: Math.round(mean(ser)),
        trend: t>2?'rising':t<-2?'falling':'stable',
        trendValue: +t.toFixed(1), dataPoints: ser.length,
      };
    });

    const anomalies: object[] = [];
    for (const [dId, de] of Object.entries(byD)) {
      if (de.length < 5) continue;
      const dist = districts.find(d=>d.id===dId); if (!dist) continue;
      const ser = de.map(e=>e.offlineCount);
      const m=mean(ser), sd=stdDev(ser); if (sd===0) continue;
      for (const e of de.slice(-14)) {
        const z=(e.offlineCount-m)/sd;
        if (Math.abs(z)>=1.5) {
          anomalies.push({ districtId:dId, districtName:dist.name,
            date: e.date.toISOString().split('T')[0],
            offlineCount:e.offlineCount, expected:Math.round(m),
            zScore:+z.toFixed(2), severity:Math.abs(z)>=3?'critical':Math.abs(z)>=2?'high':'medium',
            direction:e.offlineCount>m?'above':'below' });
        }
      }
    }
    anomalies.sort((a:any,b:any)=>['critical','high','medium'].indexOf(a.severity)-['critical','high','medium'].indexOf(b.severity));

    const riskScores = districts.map(d => {
      const de = byD[d.id]||[];
      if (!de.length) return { districtId:d.id, districtName:d.name, districtCode:d.code, score:0, level:'unknown', factors:[], avgOfflinePct:0, recentOfflinePct:0 };
      const pcts=de.map(e=>e.offlinePct), avg=mean(pcts), recent=mean(pcts.slice(-3)), tr=slope(pcts.slice(-7)), inst=stdDev(pcts);
      let sc=Math.min(40,avg*2.2)+Math.min(25,recent*1.5)+Math.min(20,Math.max(0,tr*5))+Math.min(15,inst*2);
      sc=Math.round(Math.min(100,sc));
      const level=sc>=70?'critical':sc>=50?'high':sc>=30?'medium':'low';
      const factors:string[]=[];
      if (avg>15) factors.push(`High avg offline: ${avg.toFixed(1)}%`);
      if (recent>avg*1.2) factors.push('Recent spike detected');
      if (tr>2) factors.push('Offline count rising');
      if (inst>5) factors.push('Inconsistent performance');
      return { districtId:d.id, districtName:d.name, districtCode:d.code, score:sc, level, factors, avgOfflinePct:+avg.toFixed(1), recentOfflinePct:+recent.toFixed(1) };
    });
    riskScores.sort((a,b)=>b.score-a.score);

    const depMap: Record<string,{value:number;type:string}> = {
      'CAT6 Cable':{value:0,type:'internal'},'3-Core Power':{value:0,type:'internal'},
      'GPON Issues':{value:0,type:'internal'},'OFC Issues':{value:0,type:'internal'},
      'Camera Store/Replace':{value:0,type:'internal'},'Cam Fluctuating':{value:0,type:'internal'},
      'Need to Check':{value:0,type:'internal'},'Fiber Required':{value:0,type:'internal'},
      'Hydra Ladder':{value:0,type:'internal'},'MCB Issue':{value:0,type:'internal'},
      '8-Port Switch':{value:0,type:'internal'},'Road Extension':{value:0,type:'external'},
      'No OLT':{value:0,type:'external'},'Pop Down':{value:0,type:'external'},
      'JB Accident':{value:0,type:'external'},'Renovation':{value:0,type:'external'},
      'Power Disconnection':{value:0,type:'external'},'DGP Office':{value:0,type:'external'},
      'Need Peer IP':{value:0,type:'external'},
    };
    for (const e of entries) {
      depMap['CAT6 Cable'].value+=e.cat6Cable; depMap['3-Core Power'].value+=e.threeCorepower;
      depMap['GPON Issues'].value+=e.gponIssues; depMap['OFC Issues'].value+=e.ofcIssues;
      depMap['Camera Store/Replace'].value+=e.cameraStoreReplacement; depMap['Cam Fluctuating'].value+=e.camerasFluctuating;
      depMap['Need to Check'].value+=e.needToCheck; depMap['Fiber Required'].value+=e.fiberRequired;
      depMap['Hydra Ladder'].value+=e.hydraLadder; depMap['MCB Issue'].value+=e.mcbIssue;
      depMap['8-Port Switch'].value+=e.switch8portIssue; depMap['Road Extension'].value+=e.roadExtensionConstruction;
      depMap['No OLT'].value+=e.noOlt; depMap['Pop Down'].value+=e.popDown;
      depMap['JB Accident'].value+=e.jbAccident; depMap['Renovation'].value+=e.renovation;
      depMap['Power Disconnection'].value+=e.powerDisconnection; depMap['DGP Office'].value+=e.dgpOffice;
      depMap['Need Peer IP'].value+=e.needPeerIp;
    }
    const totalDeps=Object.values(depMap).reduce((s,d)=>s+d.value,0);
    const rootCauses=Object.entries(depMap)
      .map(([label,d])=>({label,value:d.value,type:d.type,percentage:totalDeps>0?+(d.value/totalDeps*100).toFixed(1):0}))
      .filter(d=>d.value>0).sort((a,b)=>b.value-a.value).slice(0,12);

    const dailyMap: Record<string,any>={};
    for (const e of entries) {
      const dt=e.date.toISOString().split('T')[0];
      if (!dailyMap[dt]) dailyMap[dt]={date:dt,offline:0,total:0,internal:0,external:0};
      dailyMap[dt].offline+=e.offlineCount; dailyMap[dt].total+=e.totalCount;
      dailyMap[dt].internal+=e.internalSum; dailyMap[dt].external+=e.externalSum;
    }
    const dailyTrend=Object.values(dailyMap).sort((a:any,b:any)=>a.date.localeCompare(b.date))
      .map((d:any)=>({...d,offlinePct:d.total>0?+(d.offline/d.total*100).toFixed(1):0}));

    return NextResponse.json({
      success: true,
      data: {
        period:{ days, from:from.toISOString(), totalEntries:entries.length },
        summary:{ totalOffline:entries.reduce((s,e)=>s+e.offlineCount,0),
          avgOfflinePct:+mean(entries.map(e=>e.offlinePct)).toFixed(1),
          districtsReporting:Object.keys(byD).length },
        predictions, anomalies, riskScores, rootCauses, dailyTrend,
      },
    });
  } catch (e) {
    console.error('ML insights error:', e);
    return NextResponse.json({ success: false, error: 'Failed to compute insights' }, { status: 500 });
  }
}