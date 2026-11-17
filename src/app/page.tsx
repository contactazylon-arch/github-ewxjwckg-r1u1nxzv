'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity, Bell, Bot, ChevronDown, Compass, Globe2,
  LayoutDashboard, Search, Settings, Sparkles, Users, Plus,
  ArrowUpRight, Server, Menu, X, RefreshCw, ShieldCheck, Crown
} from 'lucide-react';

type Lang = 'fr' | 'en';
type Page = 'overview' | 'discover' | 'servers' | 'studio' | 'alerts' | 'settings';
type DiscordGuild = { id: string; name: string; icon: string | null; owner: boolean; permissions: string };

const copy = {
  fr: {
    overview:'Vue d’ensemble', discover:'Découverte', servers:'Mes serveurs', studio:'Studio créateur',
    alerts:'Notifications', settings:'Paramètres', personal:'ESPACE PERSONNEL',
    subtitle:'Retrouvez votre écosystème Discord en un seul endroit.',
    add:'Ajouter un bot', serversConnected:'Serveurs connectés', listedBots:'Bots référencés',
    monitored:'Bots surveillés', openAlerts:'Alertes ouvertes', activity:'Activité de la plateforme',
    week:'7 derniers jours', system:'État des services', api:'API BotNexus', database:'Base de données',
    monitoring:'Monitoring', demo:'Démonstration', recent:'Bots récemment consultés',
    directory:'Voir l’annuaire', recommendations:'Recommandations pour votre serveur',
    recommendation:'Vous pourriez ajouter un bot de bienvenue',
    recommendationDetail:'Exemple de recommandation — une analyse autorisée du serveur sera nécessaire.',
    pro:'BotNexus Pro', proText:'Débloquez les outils avancés.', explore:'Découvrir Pro',
    search:'Rechercher des bots, catégories…', all:'Tous', moderation:'Modération',
    music:'Musique', games:'Jeux', utility:'Utilitaires', verified:'Vérifié',
    emptyServers:'Connectez Discord pour afficher les serveurs sur lesquels vous disposez des permissions nécessaires.',
    connect:'Connexion Discord bientôt disponible', projects:'Vos projets créateurs',
    create:'Créer un projet', noProjects:'Aucun projet connecté pour le moment.',
    alertsText:'Les alertes de disponibilité nécessiteront une intégration de monitoring.',
    account:'Compte et préférences', language:'Langue de l’interface', french:'Français', english:'Anglais',
    sample:'Données de démonstration — aucune donnée Discord réelle n’est connectée.',
    statusOnline:'Opérationnel', statusDemo:'Démo', profile:'Utilisateur invité', connectDiscord:'Se connecter avec Discord',
    directoryIntro:'Explorez le catalogue et trouvez les outils adaptés à vos communautés.',
    allBots:'Catalogue Topbot.gg', catalogSource:'Catalogue Topbot.gg', noResults:'Aucun bot ne correspond à cette recherche.',
    serversIntro:'Retrouvez les serveurs associés à votre compte Discord et vos droits sur chacun.', refresh:'Actualiser', loadingServers:'Récupération de vos serveurs Discord…', noServers:'Aucun serveur Discord n’a été retourné pour ce compte.', noManageServers:'Aucun serveur ne vous accorde actuellement les droits de gestion.', manageAccess:'Gestion disponible', limitedAccess:'Accès limité', owner:'Propriétaire', openDiscord:'Ouvrir dans Discord', searchServers:'Rechercher un serveur…', allServers:'Tous', manageableOnly:'Gestion possible', guildError:'Impossible de récupérer vos serveurs Discord. Réessayez dans un instant.'
  },
  en: {
    overview:'Overview', discover:'Discover', servers:'My servers', studio:'Creator studio',
    alerts:'Notifications', settings:'Settings', personal:'PERSONAL SPACE',
    subtitle:'Your Discord ecosystem, all in one place.',
    add:'Add a bot', serversConnected:'Connected servers', listedBots:'Listed bots',
    monitored:'Monitored bots', openAlerts:'Open alerts', activity:'Platform activity',
    week:'Last 7 days', system:'Service status', api:'BotNexus API', database:'Database',
    monitoring:'Monitoring', demo:'Demo', recent:'Recently viewed bots',
    directory:'View directory', recommendations:'Recommendations for your server',
    recommendation:'You could add a welcome bot',
    recommendationDetail:'Sample recommendation — authorized server analysis will be required.',
    pro:'BotNexus Pro', proText:'Unlock advanced tools.', explore:'Explore Pro',
    search:'Search bots, categories…', all:'All', moderation:'Moderation',
    music:'Music', games:'Games', utility:'Utilities', verified:'Verified',
    emptyServers:'Connect Discord to display servers where you have the required permissions.',
    connect:'Discord connection coming soon', projects:'Your creator projects',
    create:'Create a project', noProjects:'No connected projects yet.',
    alertsText:'Availability alerts will require a monitoring integration.',
    account:'Account and preferences', language:'Interface language', french:'French', english:'English',
    sample:'Sample data — no real Discord data is connected.',
    statusOnline:'Operational', statusDemo:'Demo', profile:'Guest user', connectDiscord:'Connect with Discord',
    directoryIntro:'Explore the catalogue and find tools for your communities.',
    allBots:'Topbot.gg catalogue', catalogSource:'Topbot.gg catalogue', noResults:'No bots match this search.',
    serversIntro:'View the servers linked to your Discord account and your permissions for each one.', refresh:'Refresh', loadingServers:'Loading your Discord servers…', noServers:'No Discord servers were returned for this account.', noManageServers:'You do not currently have management permissions on any server.', manageAccess:'Management available', limitedAccess:'Limited access', owner:'Owner', openDiscord:'Open in Discord', searchServers:'Search servers…', allServers:'All', manageableOnly:'Can manage', guildError:'Unable to retrieve your Discord servers. Please try again.'
  }
} as const;

type DiscoverBot = { id:string; name:string; category:string; description:string; tag:string; verified:boolean; letter:string; tone:string; inviteUrl:string|null; websiteUrl:string|null; };
type CatalogApiBot = {
  id?: unknown;
  name?: unknown;
  categories?: unknown;
  description?: unknown;
  tags?: unknown;
  verified?: unknown;
  inviteUrl?: unknown;
  websiteUrl?: unknown;
};


const navItems: {id:Page; icon:typeof LayoutDashboard; key:keyof typeof copy.fr}[] = [
  {id:'overview',icon:LayoutDashboard,key:'overview'},
  {id:'discover',icon:Compass,key:'discover'},
  {id:'servers',icon:Server,key:'servers'},
  {id:'studio',icon:Bot,key:'studio'},
  {id:'alerts',icon:Bell,key:'alerts'},
];

export default function Home() {
  const [lang,setLang] = useState<Lang>('fr');
  const [page,setPage] = useState<Page>('overview');
  const [query,setQuery] = useState('');
  const [category,setCategory] = useState('All');
  const [selectedDiscoverBot,setSelectedDiscoverBot] = useState<string | null>(null);
  const [catalogBots, setCatalogBots] = useState<DiscoverBot[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPages, setCatalogPages] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogTotalCount, setCatalogTotalCount] = useState<number | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [translatedDescriptions, setTranslatedDescriptions] = useState<Record<string, string>>({});
  const [translationLoading, setTranslationLoading] = useState<string | null>(null);
  const [translationErrors, setTranslationErrors] = useState<Record<string, string>>({});
  const [discordUser, setDiscordUser] = useState<{ id: string; username: string; globalName: string | null; avatar: string | null } | null>(null);
  const [discordGuildCount, setDiscordGuildCount] = useState<number | null>(null);
  const [discordGuilds, setDiscordGuilds] = useState<DiscordGuild[]>([]);
  const [guildsLoading, setGuildsLoading] = useState(true);
  const [guildsUnavailable, setGuildsUnavailable] = useState(false);
  const [guildSearch, setGuildSearch] = useState('');
  const [manageableOnly, setManageableOnly] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(response => response.ok ? response.json() as Promise<{ authenticated?: boolean; user?: { id: string; username: string; globalName: string | null; avatar: string | null }; guilds?: DiscordGuild[]; guildsUnavailable?: boolean }> : null)
      .then(data => {
        if (!active) return;
        if (data?.authenticated && data.user) {
          const guilds = Array.isArray(data.guilds) ? data.guilds : [];
          setDiscordUser(data.user);
          setDiscordGuilds(guilds);
          setDiscordGuildCount(data.guildsUnavailable ? null : guilds.length);
          setGuildsUnavailable(data.guildsUnavailable === true);
        } else {
          setDiscordUser(null);
          setDiscordGuilds([]);
          setDiscordGuildCount(null);
          setGuildsUnavailable(false);
        }
      })
      .catch(() => { if (active) { setDiscordUser(null); setDiscordGuilds([]); setDiscordGuildCount(null); setGuildsUnavailable(true); } })
      .finally(() => { if (active) { setSessionLoading(false); setGuildsLoading(false); } });
    return () => { active = false; };
  }, []);

  const disconnectDiscord = async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (response.ok) {
      setDiscordUser(null);
      setDiscordGuildCount(null);
      setDiscordGuilds([]);
      setGuildsUnavailable(false);
    }
  };

  const refreshDiscordGuilds = async () => {
    setGuildsLoading(true);
    setGuildsUnavailable(false);
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!response.ok) throw new Error('session_unavailable');
      const data = await response.json() as { authenticated?: boolean; guilds?: DiscordGuild[]; guildsUnavailable?: boolean };
      if (!data.authenticated) {
        setDiscordUser(null);
        setDiscordGuilds([]);
        setDiscordGuildCount(null);
      } else {
        const guilds = Array.isArray(data.guilds) ? data.guilds : [];
        setDiscordGuilds(guilds);
        setDiscordGuildCount(data.guildsUnavailable ? null : guilds.length);
        setGuildsUnavailable(data.guildsUnavailable === true);
      }
    } catch {
      setGuildsUnavailable(true);
    } finally {
      setGuildsLoading(false);
    }
  };

  const canManageGuild = (guild: DiscordGuild) => {
    try {
      const permissions = BigInt(guild.permissions || '0');
      return guild.owner || (permissions & 40n) !== 0n;
    } catch {
      return guild.owner;
    }
  };

  const visibleGuilds = discordGuilds.filter(guild => {
    const matchesSearch = guild.name.toLowerCase().includes(guildSearch.trim().toLowerCase());
    return matchesSearch && (!manageableOnly || canManageGuild(guild));
  });

  useEffect(() => {
    let active = true;
    fetch('/api/catalog/bots?page=1&limit=1&sort=votes_month')
      .then(response => {
        if (!response.ok) throw new Error('Catalogue indisponible');
        return response.json() as Promise<{ pagination?: { total?: number | string } }>;
      })
      .then(data => {
        if (active) setCatalogTotalCount(Number(data.pagination?.total) || 0);
      })
      .catch(() => { if (active) setCatalogTotalCount(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (page !== 'discover' || catalogLoading) return;
    let active = true;
    setCatalogError(null);
    setCatalogLoading(true);
    const params = new URLSearchParams({ page: String(catalogPage), limit: '50', sort: 'votes_month' });
    if (submittedQuery.trim()) params.set('search', submittedQuery.trim());
    fetch('/api/catalog/bots?' + params.toString())
      .then(async response => {
        if (!response.ok) {
          const details = await response.json().catch(() => ({})) as { upstreamStatus?: number; diagnostic?: string };
          const message = details.upstreamStatus
            ? `Topbot.gg répond HTTP ${details.upstreamStatus}.`
            : details.diagnostic === 'upstream_timeout'
              ? 'Topbot.gg ne répond pas dans le délai prévu.'
              : details.diagnostic === 'upstream_invalid_json'
                ? 'Topbot.gg a renvoyé une réponse invalide.'
                : 'Connexion à Topbot.gg impossible.';
          throw new Error(message);
        }
        return response.json() as Promise<{ bots?: CatalogApiBot[]; pagination?: { pages?: number | string; total?: number | string } }>;
      })
      .then(data => {
        if (!active) return;
        const rows = Array.isArray(data.bots) ? data.bots : [];
        setCatalogPages(Number(data.pagination?.pages) || 1);
        setCatalogTotal(Number(data.pagination?.total) || rows.length);
        setCatalogBots(rows.map((bot: CatalogApiBot) => ({
          id: String(bot.id),
          name: String(bot.name || 'Bot Discord'),
          category: Array.isArray(bot.categories) && bot.categories.length ? String(bot.categories[0]) : 'Utilities',
          description: String(bot.description || ''),
          tag: Array.isArray(bot.tags) && bot.tags.length ? String(bot.tags[0]) : 'Discord bot',
          verified: bot.verified === true,
          letter: String(bot.name || 'B').charAt(0).toUpperCase(),
          tone: 'blue',
          inviteUrl: typeof bot.inviteUrl === 'string' ? bot.inviteUrl : null,
          websiteUrl: typeof bot.websiteUrl === 'string' ? bot.websiteUrl : null
        })));
      })
      .catch((error: unknown) => { if (active) setCatalogError(error instanceof Error ? error.message : 'Catalogue indisponible.'); })
      .finally(() => { if (active) { setCatalogLoading(false); setCatalogLoaded(true); } });
    return () => { active = false; };
  }, [page, catalogPage, submittedQuery]);

  const [mobileOpen,setMobileOpen] = useState(false);
  const t = copy[lang];

  useEffect(() => {
    if (lang !== 'fr' || !selectedDiscoverBot) return;
    const selectedBot = catalogBots.find(bot => bot.name === selectedDiscoverBot);
    if (!selectedBot?.description.trim() || translatedDescriptions[selectedBot.id] || translationErrors[selectedBot.id]) return;

    let active = true;
    setTranslationLoading(selectedBot.id);
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: selectedBot.description }),
    })
      .then(async response => {
        const data = await response.json().catch(() => ({})) as { translatedText?: string; error?: string };
        if (!response.ok || typeof data.translatedText !== 'string' || !data.translatedText.trim()) {
          throw new Error(data.error || 'Traduction indisponible');
        }
        return data.translatedText;
      })
      .then(translatedText => {
        if (active) setTranslatedDescriptions(previous => ({ ...previous, [selectedBot.id]: translatedText }));
      })
      .catch(() => {
        if (active) setTranslationErrors(previous => ({ ...previous, [selectedBot.id]: 'Traduction indisponible pour le moment.' }));
      })
      .finally(() => {
        if (active) setTranslationLoading(null);
      });

    return () => { active = false; };
  }, [lang, selectedDiscoverBot, catalogBots, translatedDescriptions, translationErrors]);

  const filteredBots = useMemo(() => catalogBots.filter(bot => {
    const matchesQuery = !submittedQuery || `${bot.name} ${bot.description} ${bot.category}`.toLowerCase().includes(submittedQuery.toLowerCase());
    const matchesCategory = category === 'All' || bot.category.toLowerCase() === category.toLowerCase();
    return matchesQuery && matchesCategory;
  }),[catalogBots,submittedQuery,category]);

  const title = t[page === 'overview' ? 'overview' : page];
  const go = (next:Page) => { setPage(next); setMobileOpen(false); };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b px-4 md:px-6" style={{background:'#10182a',borderColor:'var(--line)'}}>
        <div className="flex items-center gap-3">
          <button className="rounded-lg p-2 md:hidden hover:bg-white/5" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen?<X size={19}/>:<Menu size={19}/>}</button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-black text-white" style={{background:'linear-gradient(135deg,#527cff,#9560e8)'}}>B</div>
          <div><div className="font-extrabold tracking-wide">BOT<span style={{color:'#9b85ff'}}>NEXUS</span></div><div className="text-[9px] tracking-[.18em] text-slate-400">THE DISCORD BOT ECOSYSTEM</div></div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={()=>setLang(lang==='fr'?'en':'fr')} className="rounded-lg border px-3 py-2 text-xs text-slate-300" style={{borderColor:'var(--line)'}}><Globe2 size={14} className="mr-2 inline"/>{lang.toUpperCase()} <ChevronDown size={12} className="ml-1 inline"/></button>
          {discordUser ? (
            <button type="button" onClick={() => go('settings')} className="flex max-w-[132px] items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-white/5" aria-label="Voir mon compte Discord">
              {discordUser.avatar ? <img src={`https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=64`} alt="" className="h-8 w-8 shrink-0 rounded-full" /> : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-900 text-xs font-bold">{(discordUser.globalName || discordUser.username).charAt(0).toUpperCase()}</div>}
              <span className="truncate text-[11px] font-medium text-slate-200">{discordUser.globalName || discordUser.username}</span>
            </button>
          ) : (
            <a href="/api/auth/discord" className="rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-indigo-500">{sessionLoading ? '…' : t.connectDiscord}</a>
          )}
        </div>
      </header>

      <div className="flex">
        <aside className={`${mobileOpen?'fixed inset-y-[68px] left-0 z-20 flex':'hidden'} w-[238px] shrink-0 flex-col border-r p-4 md:sticky md:top-[68px] md:flex md:h-[calc(100vh-68px)]`} style={{background:'#0e1526',borderColor:'var(--line)'}}>
          <div className="mb-3 px-3 text-[10px] font-semibold tracking-[.16em] text-slate-500">{t.personal}</div>
          <nav className="space-y-1">
            {navItems.map(item=>{const Icon=item.icon;return <button key={item.id} onClick={()=>go(item.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition ${page===item.id?'bg-indigo-500/20 text-white':'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon size={17}/>{t[item.key]}</button>})}
          </nav>
          <div className="mb-3 mt-7 px-3 text-[10px] font-semibold tracking-[.16em] text-slate-500">PERSONNEL</div>
          <button onClick={()=>go('settings')} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] ${page==='settings'?'bg-indigo-500/20 text-white':'text-slate-400 hover:bg-white/5'}`}><Settings size={17}/>{t.settings}</button>
          <div className="mt-auto rounded-xl border p-3" style={{background:'#172440',borderColor:'#2c416a'}}>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold"><Sparkles size={14} className="text-violet-300"/>{t.pro}</div>
            <p className="mb-3 text-[11px] text-slate-400">{t.proText}</p>
            <button onClick={()=>go('settings')} className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{background:'#6852cf'}}>{t.explore}</button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div><div className="mb-1 text-[10px] font-semibold tracking-[.16em] text-slate-500">BOTNEXUS / {title.toUpperCase()}</div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-xs text-slate-400">{page==='overview'?t.subtitle:page==='discover'?t.directoryIntro:''}</p></div>
            <button onClick={()=>go(page==='studio'?'studio':'discover')} className="rounded-lg px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-950/40" style={{background:'linear-gradient(110deg,#526de0,#8059d8)'}}><Plus size={14} className="mr-1 inline"/>{page==='studio'?t.create:t.add}</button>
          </div>

          {page==='overview' && <>
            {discordUser && <section className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border p-4" style={{background:'var(--panel)',borderColor:'var(--line)'}}>
              {discordUser.avatar ? <img src={`https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=96`} alt="" className="h-12 w-12 rounded-full" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-900 text-lg font-bold">{(discordUser.globalName || discordUser.username).charAt(0).toUpperCase()}</div>}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Compte Discord connecté</div>
                <div className="mt-1 truncate text-sm font-bold text-white">{discordUser.globalName || discordUser.username}</div>
                <div className="text-[11px] text-slate-400">@{discordUser.username}{discordGuildCount !== null ? ` · ${discordGuildCount} serveur(s) accessible(s)` : ''}</div>
              </div>
              <button type="button" onClick={disconnectDiscord} className="rounded-lg border border-slate-600 px-3 py-2 text-[11px] text-slate-300 hover:bg-white/5">Déconnexion</button>
            </section>}
            <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                {label:t.serversConnected,value:'04',sub:'↑ 1 ce mois',icon:Users,color:'#8da8ff'},
                {label:t.listedBots,value:catalogTotalCount === null ? '…' : catalogTotalCount.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US'),sub:t.catalogSource,icon:Bot,color:'#b69bff'},
                {label:t.monitored,value:'12',sub:'11 opérationnels',icon:Activity,color:'#64dcb2'},
                {label:t.openAlerts,value:'01',sub:'À vérifier',icon:Bell,color:'#f3c477'},
              ].map((m,i)=>{const Icon=m.icon;return <div className="rounded-xl border p-4" style={{background:'var(--panel)',borderColor:'var(--line)'}} key={i}><div className="flex items-center justify-between text-[11px] text-slate-400">{m.label}<Icon size={16} style={{color:m.color}}/></div><div className="mt-3 text-2xl font-extrabold tracking-tight">{m.value}</div><div className="mt-1 text-[10px] text-slate-500">{m.sub}</div></div>})}
            </div>
            <div className="mb-4 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
              <section className="rounded-xl border p-4 md:p-5" style={{background:'var(--panel)',borderColor:'var(--line)'}}>
                <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">{t.activity}</h2><span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-[10px] text-indigo-200">{t.week}</span></div>
                <div className="flex h-32 items-end gap-2 px-1">{[42,57,48,76,62,88,70].map((height,i)=><div key={i} className="flex-1 rounded-t-md" style={{height:`${height}%`,background:i===5?'#9278f4':i===3?'#6e6bd5':'#465caa'}}/>)}</div>
                <div className="mt-2 flex justify-between text-[10px] text-slate-500">{['Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.','Dim.'].map(x=><span key={x}>{x}</span>)}</div>
                <p className="mt-4 text-[10px] text-slate-500">{t.sample}</p>
              </section>
              <section className="rounded-xl border p-4 md:p-5" style={{background:'var(--panel)',borderColor:'var(--line)'}}>
                <h2 className="mb-4 text-sm font-semibold">{t.system}</h2>
                {[{label:t.api,ok:true},{label:t.database,ok:true},{label:t.monitoring,ok:false}].map((x,i)=><div key={i} className="flex items-center justify-between border-b border-slate-700/50 py-3 last:border-0"><div className="flex items-center gap-2 text-xs"><span className={`h-2 w-2 rounded-full ${x.ok?'bg-emerald-400':'bg-amber-400'}`}/>{x.label}</div><span className={`rounded-full px-2 py-1 text-[9px] ${x.ok?'bg-emerald-500/10 text-emerald-300':'bg-amber-500/10 text-amber-300'}`}>{x.ok?t.statusOnline:t.statusDemo}</span></div>)}
                <p className="mt-3 text-[10px] text-slate-500">{t.sample}</p>
              </section>
            </div>
            <section className="mb-4 rounded-xl border p-4 md:p-5" style={{background:'var(--panel)',borderColor:'var(--line)'}}>
              <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">{t.recent}</h2><button onClick={()=>go('discover')} className="text-xs text-violet-300">{t.directory} <ArrowUpRight size={13} className="inline"/></button></div>
              <BotRows />
            </section>
            <section className="rounded-xl border p-4 md:p-5" style={{background:'var(--panel)',borderColor:'var(--line)'}}><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-violet-300"/>{t.recommendations}</div><p className="text-xs font-medium">{t.recommendation}</p><p className="mt-1 text-[11px] text-slate-400">{t.recommendationDetail}</p><button onClick={()=>go('discover')} className="mt-3 text-xs text-violet-300">{t.directory} →</button></section>
          </>}

          {page==='discover' && <section className="rounded-xl border p-4 md:p-5" style={{background:'var(--panel)',borderColor:'var(--line)'}}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row"><div className="flex flex-1 items-center gap-2 rounded-lg border px-3" style={{borderColor:'var(--line)',background:'#0d1425'}}><Search size={16} className="text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){setCatalogPage(1);setSubmittedQuery(query);setCatalogLoaded(false);}}} placeholder={t.search} className="w-full bg-transparent py-3 text-xs outline-none"/><button type="button" onClick={()=>{setCatalogPage(1);setSubmittedQuery(query);setCatalogLoaded(false);}} className="rounded-md bg-indigo-500/20 px-3 py-2 text-xs text-indigo-200">Rechercher</button></div><select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-lg border px-3 py-2 text-xs" style={{background:'#0d1425',borderColor:'var(--line)'}}><option value="All">{t.all}</option><option value="Moderation">{t.moderation}</option><option value="Music">{t.music}</option><option value="Games">{t.games}</option><option value="Utilities">{t.utility}</option></select></div>
            <div className="mb-3 text-xs font-semibold">{t.allBots} <span className="text-slate-500">({catalogTotal})</span></div>
            {catalogLoading && <p className="py-6 text-center text-xs text-slate-400">Chargement du catalogue réel…</p>}
            {catalogLoaded && !catalogLoading && catalogBots.length > 0 && <div className="mb-3 text-[10px] text-slate-500">Page {catalogPage} / {catalogPages} · Source : Topbot.gg</div> }
            {catalogError && <p className="py-6 text-center text-xs text-amber-300">{catalogError}</p>}
            {!catalogLoading && !catalogError && catalogBots.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Aucun bot disponible pour le moment.</p>}
            
{filteredBots.length ? filteredBots.map(bot => (
  <div
    key={bot.name}
    className="rounded-xl border border-slate-700/50 overflow-hidden mb-2"
  >
    <button
      type="button"
      onClick={() =>
        setSelectedDiscoverBot(
          selectedDiscoverBot === bot.name ? null : bot.name
        )
      }
      aria-expanded={selectedDiscoverBot === bot.name}
      className="flex w-full items-center gap-3 p-3 text-left hover:bg-white/5 transition"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold"
        style={{
          background: bot.tone === 'blue' ? '#34466d' :
            bot.tone === 'purple' ? '#49366b' :
            bot.tone === 'green' ? '#245d58' : '#65451e'
        }}
      >
        {bot.letter}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {bot.name}
          {bot.verified && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-300">
              {t.verified}
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {bot.description}
        </p>
      </div>

      <span className="text-xs text-violet-300">
        {selectedDiscoverBot === bot.name ? '−' : '+'}
      </span>
    </button>

    {selectedDiscoverBot === bot.name && (
      <div className="border-t border-slate-700/50 p-4">
        <h3 className="mb-2 text-sm font-semibold">{bot.name}</h3>
        <p className="text-xs text-slate-400">
          {lang === 'fr' ? (translatedDescriptions[bot.id] || bot.description) : bot.description}
        </p>
        {lang === 'fr' && translationLoading === bot.id && (
          <p className="mt-2 text-[10px] text-indigo-300">Traduction en cours…</p>
        )}
        {lang === 'fr' && translationErrors[bot.id] && (
          <p className="mt-2 text-[10px] text-amber-300">{translationErrors[bot.id]} Affichage de la description originale.</p>
        )}
        {lang === 'fr' && translatedDescriptions[bot.id] && (
          <p className="mt-2 text-[10px] text-emerald-300">Traduction automatique · Cloudflare AI</p>
        )}
        <div className="mt-3 text-[10px] text-violet-300">
          {bot.tag} · {bot.category}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {bot.inviteUrl && <a href={bot.inviteUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:text-indigo-200">Inviter le bot ↗</a>}
          {bot.websiteUrl && <a href={bot.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white">Site officiel ↗</a>}
        </div>
        {bot.verified && <div className="mt-3 text-[10px] text-emerald-300">Statut vérifié attribué par Topbot.gg</div>}
      </div>
    )}
  </div>
)) : (
  <p className="py-8 text-center text-xs text-slate-400">
    {t.noResults}
  </p>
)}
           <div className="mt-4 flex items-center justify-between"><p className="text-[10px] text-slate-500">Source : Topbot.gg · Catalogue public actualisé automatiquement.</p><div className="flex gap-2"><button disabled={catalogPage<=1 || catalogLoading || Boolean(submittedQuery)} onClick={()=>setCatalogPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-700 px-3 py-2 text-xs disabled:opacity-40">Précédent</button><button disabled={catalogPage>=catalogPages || catalogLoading || Boolean(submittedQuery)} onClick={()=>setCatalogPage(p=>p+1)} className="rounded-md border border-slate-700 px-3 py-2 text-xs disabled:opacity-40">Suivant</button></div></div>
          </section>}

          {page==='servers' && <section className="rounded-xl border p-4 md:p-5" style={{background:'var(--panel)',borderColor:'var(--line)'}}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">{t.servers}</h2><p className="mt-1 text-xs text-slate-400">{t.serversIntro}</p></div>{discordUser && <button type="button" onClick={refreshDiscordGuilds} disabled={guildsLoading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-white/5 disabled:opacity-50"><RefreshCw size={14} className={guildsLoading?'animate-spin':''}/>{t.refresh}</button>}</div>
            {!discordUser && !sessionLoading && <div className="flex min-h-[230px] flex-col items-center justify-center text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300"><Server size={25}/></div><h3 className="mb-2 text-sm font-semibold">{t.connect}</h3><p className="mb-5 max-w-md text-xs leading-6 text-slate-400">{t.emptyServers}</p><a href="/api/auth/discord" className="rounded-lg px-4 py-2.5 text-xs font-semibold text-white" style={{background:'linear-gradient(110deg,#526de0,#8059d8)'}}>{t.connectDiscord}</a></div>}
            {sessionLoading && <p className="py-12 text-center text-xs text-slate-400">{t.loadingServers}</p>}
            {discordUser && guildsLoading && <p className="py-12 text-center text-xs text-slate-400">{t.loadingServers}</p>}
            {discordUser && !guildsLoading && guildsUnavailable && <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center"><p className="text-xs text-amber-200">{t.guildError}</p><button type="button" onClick={refreshDiscordGuilds} className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200">{t.refresh}</button></div>}
            {discordUser && !guildsLoading && !guildsUnavailable && <><div className="mb-4 flex flex-col gap-3 sm:flex-row"><div className="flex flex-1 items-center gap-2 rounded-lg border px-3" style={{borderColor:'var(--line)',background:'#0d1425'}}><Search size={15} className="text-slate-500"/><input value={guildSearch} onChange={event=>setGuildSearch(event.target.value)} placeholder={t.searchServers} className="w-full bg-transparent py-3 text-xs outline-none"/></div><button type="button" onClick={()=>setManageableOnly(value=>!value)} className={`rounded-lg border px-3 py-2 text-xs ${manageableOnly?'border-indigo-400/50 bg-indigo-500/15 text-indigo-200':'border-slate-700 text-slate-300'}`}>{manageableOnly?t.manageableOnly:t.allServers}</button></div>
              <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400"><span>{visibleGuilds.length} / {discordGuilds.length} {t.servers.toLowerCase()}</span><span>{discordGuilds.filter(canManageGuild).length} · {t.manageAccess.toLowerCase()}</span></div>
              {discordGuilds.length===0 && <p className="py-10 text-center text-xs text-slate-400">{t.noServers}</p>}{discordGuilds.length>0 && visibleGuilds.length===0 && <p className="py-10 text-center text-xs text-slate-400">{manageableOnly?t.noManageServers:t.noServers}</p>}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleGuilds.map(guild=>{const manageable=canManageGuild(guild);const iconUrl=guild.icon?`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=96`:null;return <article key={guild.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-700/60 p-3">{iconUrl?<img src={iconUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl"/>:<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-sm font-bold text-indigo-200">{guild.name.slice(0,1).toUpperCase()}</div>}<div className="min-w-0 flex-1"><h3 className="truncate text-xs font-semibold text-slate-100">{guild.name}</h3><div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">{guild.owner&&<span className="inline-flex items-center gap-1 text-amber-300"><Crown size={11}/>{t.owner}</span>}<span className={`inline-flex items-center gap-1 ${manageable?'text-emerald-300':'text-slate-400'}`}><ShieldCheck size={11}/>{manageable?t.manageAccess:t.limitedAccess}</span></div></div><a href={`https://discord.com/channels/${guild.id}`} target="_blank" rel="noopener noreferrer" aria-label={`${t.openDiscord}: ${guild.name}`} className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-2 text-[10px] text-indigo-200 hover:bg-white/5">↗</a></article>})}</div>
            </>}
          </section>}
          {page==='studio' && <Placeholder icon={Bot} title={t.projects} text={t.noProjects}/>}
          {page==='alerts' && <Placeholder icon={Bell} title={t.alerts} text={t.alertsText}/>}
          {page==='settings' && <section className="max-w-xl rounded-xl border p-5" style={{background:'var(--panel)',borderColor:'var(--line)'}}><h2 className="mb-4 text-sm font-semibold">{t.account}</h2><label className="mb-2 block text-xs text-slate-400">{t.language}</label><select value={lang} onChange={e=>setLang(e.target.value as Lang)} className="w-full rounded-lg border p-3 text-xs" style={{background:'#0d1425',borderColor:'var(--line)'}}><option value="fr">{t.french}</option><option value="en">{t.english}</option></select></section>}
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600"><span>BOTNEXUS · THE DISCORD BOT ECOSYSTEM</span><span>Prototype UI · v0.1.0</span></footer>
        </main>
      </div>
    </div>
  );
}


function BotRows() {
  const [selectedBot, setSelectedBot] = useState<string | null>(null);

  const rows = [
    {
      letter: 'M',
      name: 'MEE6',
      desc: 'Modération · Utilitaires',
      status: 'Vérifié',
      details: 'Bot multifonction permettant de gérer votre communauté Discord, la modération et différentes automatisations.'
    },
    {
      letter: 'C',
      name: 'Carl-bot',
      desc: 'Automatisation · Rôles',
      status: 'Vérifié',
      details: 'Bot spécialisé dans les rôles automatiques, les messages personnalisés et la gestion de votre serveur.'
    },
    {
      letter: 'S',
      name: 'Sapphire',
      desc: 'Modération · Gestion',
      status: 'Catalogue',
      details: 'Bot proposant des outils de modération et de gestion pour les communautés Discord.'
    }
  ];

  return (
    <div className="space-y-2">
      {rows.map((bot) => (
        <div
          key={bot.name}
          className="rounded-xl border border-slate-700/50 overflow-hidden"
        >
          <button
            type="button"
            onClick={() =>
              setSelectedBot(
                selectedBot === bot.name ? null : bot.name
              )
            }
            aria-expanded={selectedBot === bot.name}
            className="flex w-full items-center gap-3 p-3 text-left hover:bg-white/5 transition"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-950 font-bold">
              {bot.letter}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold">{bot.name}</div>
              <div className="text-[10px] text-slate-500">
                {bot.desc}
              </div>
            </div>

            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] text-emerald-300">
              {bot.status}
            </span>

            <span className="text-xs text-violet-300">
              {selectedBot === bot.name ? '−' : '+'}
            </span>
          </button>

          {selectedBot === bot.name && (
            <div className="border-t border-slate-700/50 p-4">
              <h3 className="mb-2 text-sm font-semibold">
                {bot.name}
              </h3>

              <p className="text-xs leading-6 text-slate-400">
                {bot.details}
              </p>

              <div className="mt-3 text-[10px] text-violet-300">
                Fiche de démonstration BotNexus
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Placeholder({icon:Icon,title,text}:{icon:typeof Server;title:string;text:string}) {
  return <section className="flex min-h-[310px] flex-col items-center justify-center rounded-xl border p-8 text-center" style={{background:'var(--panel)',borderColor:'var(--line)'}}><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300"><Icon size={25}/></div><h2 className="mb-2 text-sm font-semibold">{title}</h2><p className="max-w-md text-xs leading-6 text-slate-400">{text}</p><span className="mt-5 rounded-full bg-amber-500/10 px-3 py-1.5 text-[10px] text-amber-300">Intégration à venir</span></section>;
}
