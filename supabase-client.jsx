// supabase-client.jsx — global Supabase client + data access layer.
// Exposes:
//   window.sb          → raw supabase-js client
//   window.gainz       → typed-ish data helpers (profile, weight, muscles, sessions, plans, leaderboard, quotes)
//   window.gainzAuth   → auth helpers (signUp, signIn, signOut, onChange, getUser)
//   window.useAuth()   → React hook returning current { user, loading }
//   window.useGainzData(user) → React hook returning { data, setData, reload } backed by Supabase

const SUPABASE_URL  = 'https://solnmzpdygzlgpzalkry.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvbG5tenBkeWd6bGdwemFsa3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDA4MTgsImV4cCI6MjA5MzgxNjgxOH0.HaONInwI0Vb1SpUVl58S6P_AkuCEv-cTTXNdgdCMEgE';

// supabase-js UMD attaches a `supabase` global with `createClient`
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'gainz-auth',
  },
});
window.sb = sb;

// ---------------- Auth ----------------
window.gainzAuth = {
  signUp:  (email, password, displayName) =>
    sb.auth.signUp({ email, password, options: { data: { display_name: displayName || null } } }),
  signIn:  (email, password) => sb.auth.signInWithPassword({ email, password }),
  signOut: () => sb.auth.signOut(),
  getUser: async () => (await sb.auth.getUser()).data.user,
  onChange: (cb) => sb.auth.onAuthStateChange((_evt, session) => cb(session?.user ?? null)),
};

window.useAuth = function useAuth() {
  const [user, setUser]       = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  return { user, loading };
};

// ---------------- Data helpers ----------------
const gainz = {
  profile: {
    async get(userId) {
      const { data, error } = await sb.from('profiles').select('*').eq('user_id', userId).single();
      if (error) throw error;
      return data;
    },
    async update(userId, patch) {
      const { error } = await sb.from('profiles').update(patch).eq('user_id', userId);
      if (error) throw error;
    },
  },

  weight: {
    async list(userId, limit = 50) {
      const { data, error } = await sb.from('weight_logs')
        .select('*').eq('user_id', userId)
        .order('logged_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return data;
    },
    async add(userId, weight, bmi) {
      const { error } = await sb.from('weight_logs').insert({ user_id: userId, weight, bmi });
      if (error) throw error;
      // mirror to profile
      await gainz.profile.update(userId, { current_weight: weight, current_bmi: bmi ?? null });
    },
  },

  muscles: {
    async map(userId) {
      const { data, error } = await sb.from('muscle_status').select('muscle,status').eq('user_id', userId);
      if (error) throw error;
      const m = {};
      data.forEach(r => { m[r.muscle] = r.status; });
      return m;
    },
    async set(userId, muscle, status) {
      const { error } = await sb.from('muscle_status')
        .upsert({ user_id: userId, muscle, status, updated_at: new Date().toISOString() },
                { onConflict: 'user_id,muscle' });
      if (error) throw error;
    },
  },

  plans: {
    async forUser(userId) {
      const { data, error } = await sb.from('workout_plans')
        .select('*').eq('user_id', userId).order('weekday');
      if (error) throw error;
      return data;
    },
    async add(userId, plan) {
      const { error } = await sb.from('workout_plans').insert({ user_id: userId, ...plan });
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await sb.from('workout_plans').delete().eq('id', id);
      if (error) throw error;
    },
  },

  sessions: {
    async start(userId, payload) {
      const { data, error } = await sb.from('workout_sessions')
        .insert({ user_id: userId, status: 'active', ...payload })
        .select().single();
      if (error) throw error;
      return data;
    },
    async addMuscles(sessionId, muscles /* [{muscle, sets, tracking}] */) {
      if (!muscles?.length) return;
      const rows = muscles.map(m => ({ session_id: sessionId, ...m }));
      const { error } = await sb.from('workout_session_muscles').insert(rows);
      if (error) throw error;
    },
    async finish(id, patch) {
      const { error } = await sb.from('workout_sessions')
        .update({ status: 'done', ended_at: new Date().toISOString(), ...patch }).eq('id', id);
      if (error) throw error;
    },
    async recent(userId, limit = 20) {
      const { data, error } = await sb.from('workout_sessions')
        .select('*').eq('user_id', userId)
        .order('started_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return data;
    },
    async count(userId) {
      const { count, error } = await sb.from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('status', 'done');
      if (error) throw error;
      return count || 0;
    },
    async muscleSets7d(userId) {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data: ses, error: e1 } = await sb.from('workout_sessions')
        .select('id').eq('user_id', userId).gte('started_at', since);
      if (e1) throw e1;
      if (!ses?.length) return {};
      const ids = ses.map(s => s.id);
      const { data: rows, error: e2 } = await sb.from('workout_session_muscles')
        .select('muscle, sets').in('session_id', ids);
      if (e2) throw e2;
      const m = {};
      rows.forEach(r => { m[r.muscle] = (m[r.muscle] || 0) + r.sets; });
      return m;
    },
    async lastTrainedDate(userId) {
      const { data, error } = await sb.from('workout_sessions')
        .select('started_at')
        .eq('user_id', userId).eq('status', 'done')
        .order('started_at', { ascending: false }).limit(1);
      if (error) throw error;
      if (!data?.length) return null;
      const d = new Date(data[0].started_at);
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
    },
    async byDateRange(userId, fromISO, toISO) {
      const { data, error } = await sb.from('workout_sessions')
        .select('id, started_at, status')
        .eq('user_id', userId)
        .gte('started_at', fromISO).lt('started_at', toISO);
      if (error) throw error;
      return data;
    },
    async monthWithMuscles(userId, year, monthIndex0) {
      const start = new Date(year, monthIndex0, 1);
      const end   = new Date(year, monthIndex0 + 1, 1);
      const { data: ses, error } = await sb.from('workout_sessions')
        .select('*').eq('user_id', userId).eq('status', 'done')
        .gte('started_at', start.toISOString())
        .lt('started_at', end.toISOString())
        .order('started_at', { ascending: false });
      if (error) throw error;
      if (!ses?.length) return [];
      const ids = ses.map(s => s.id);
      const { data: rows, error: e2 } = await sb.from('workout_session_muscles')
        .select('*').in('session_id', ids);
      if (e2) throw e2;
      const byId = {};
      (rows || []).forEach(r => { (byId[r.session_id] ||= []).push(r); });
      return ses.map(s => ({ ...s, muscles: byId[s.id] || [] }));
    },
  },

  leaderboard: {
    async week(weekStartISO) {
      const { data, error } = await sb.from('leaderboard_weekly')
        .select('user_id, score, workouts, profiles(display_name)')
        .eq('week_start', weekStartISO)
        .order('score', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    async upsertMine(userId, weekStartISO, score, workouts) {
      const { error } = await sb.from('leaderboard_weekly')
        .upsert({ user_id: userId, week_start: weekStartISO, score, workouts },
                { onConflict: 'user_id,week_start' });
      if (error) throw error;
    },
    // Add a single session's contribution to the user's weekly row:
    //   workouts += 1, score += sessionSets
    // Single round-trip via upsert(onConflict='user_id,week_start')
    async addSessionContribution(userId, weekStartISO, sessionSets) {
      console.log('[leaderboard] add session contribution', { userId, weekStartISO, sessionSets });
      // Read prior totals so the upsert can carry incremented values.
      const { data: existing, error: selErr } = await sb.from('leaderboard_weekly')
        .select('score, workouts')
        .eq('user_id', userId).eq('week_start', weekStartISO).maybeSingle();
      if (selErr) { console.error('[leaderboard] read err', selErr); throw selErr; }
      console.log('[leaderboard] existing row', existing);

      const newScore    = (Number(existing?.score)    || 0) + Number(sessionSets || 0);
      const newWorkouts = (Number(existing?.workouts) || 0) + 1;

      const { data, error } = await sb.from('leaderboard_weekly')
        .upsert({
          user_id:    userId,
          week_start: weekStartISO,
          score:      newScore,
          workouts:   newWorkouts,
        }, { onConflict: 'user_id,week_start' })
        .select();
      if (error) { console.error('[leaderboard] upsert err', error); throw error; }
      console.log('[leaderboard] upsert ok', data);
      return data;
    },
  },

  danger: {
    async resetAllData(userId) {
      // 1) Find session ids first so we can clear child rows.
      const { data: ses, error: e1 } = await sb.from('workout_sessions')
        .select('id').eq('user_id', userId);
      if (e1) throw e1;
      const sessionIds = (ses || []).map(s => s.id);
      if (sessionIds.length) {
        const { error } = await sb.from('workout_session_muscles')
          .delete().in('session_id', sessionIds);
        if (error) throw error;
      }
      // 2–4) Delete sessions, weight logs, leaderboard entries in parallel.
      const results = await Promise.all([
        sb.from('workout_sessions').delete().eq('user_id', userId),
        sb.from('weight_logs').delete().eq('user_id', userId),
        sb.from('leaderboard_weekly').delete().eq('user_id', userId),
      ]);
      for (const r of results) if (r.error) throw r.error;
      // 5) Reset muscle_status to grey for all 7 muscles.
      const ALL = ['brust','ruecken','schultern','bizeps','trizeps','bauch','beine'];
      const upserts = await Promise.all(ALL.map((m) =>
        sb.from('muscle_status').upsert(
          { user_id: userId, muscle: m, status: 'grey', updated_at: new Date().toISOString() },
          { onConflict: 'user_id,muscle' },
        )
      ));
      for (const r of upserts) if (r.error) throw r.error;
      // 6a) Core profile reset — only the original (cache-stable) columns.
      //     display_name + height_cm preserved by design.
      const { error: e6a } = await sb.from('profiles').update({
        streak: 0,
        week_done: 0,
        current_weight: null,
        current_bmi: null,
      }).eq('user_id', userId);
      if (e6a) throw e6a;

      // 6b) Newer columns (added by later migrations) — each in its own query
      //     and try/catch so a stale PostgREST schema cache for any one
      //     column doesn't roll the whole reset back. User can re-edit
      //     these later via Profil if any silently skipped.
      const tryPatch = async (label, patch) => {
        try {
          const { error } = await sb.from('profiles').update(patch).eq('user_id', userId);
          if (error) console.warn(`reset: ${label} skipped:`, error.message);
        } catch (e) {
          console.warn(`reset: ${label} threw:`, e?.message || e);
        }
      };
      await tryPatch('target_weight',  { target_weight: null });
      await tryPatch('muscle_targets', {
        muscle_targets: {
          brust: 20, ruecken: 20, schultern: 20, bizeps: 20,
          trizeps: 20, bauch: 20, beine: 20,
        },
      });
    },
  },

  quotes: {
    async random() {
      const { data, error } = await sb.from('daily_quotes').select('*').eq('active', true);
      if (error) throw error;
      if (!data?.length) return null;
      return data[Math.floor(Math.random() * data.length)];
    },
  },
};
window.gainz = gainz;

// ---------------- React hook: full app data backed by Supabase ----------------
window.useGainzData = function useGainzData(user) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    if (!user) { setData(null); setLoading(false); return; }
    setLoading(true);
    try {
      const [profile, heatmap, quote, weightsDesc, sessionsCount, muscleSets7d] = await Promise.all([
        gainz.profile.get(user.id),
        gainz.muscles.map(user.id),
        gainz.quotes.random(),
        gainz.weight.list(user.id, 50),
        gainz.sessions.count(user.id),
        gainz.sessions.muscleSets7d(user.id),
      ]);
      // chronological ascending for chart consumption
      const weightLogs = [...weightsDesc].reverse().map(r => ({
        ...r,
        weight: Number(r.weight),
        bmi:    r.bmi != null ? Number(r.bmi) : null,
      }));
      // delta only meaningful with ≥ 2 entries
      const last = weightLogs[weightLogs.length - 1];
      const prev = weightLogs[weightLogs.length - 2];
      const delta = (last && prev)
        ? +(last.weight - prev.weight).toFixed(1)
        : null;
      setData({
        name:        profile.display_name,
        streak:      profile.streak,
        weekDone:    profile.week_done,
        weekGoal:    profile.week_goal,
        weight:      Number(profile.current_weight ?? 0),
        weightDelta: delta,        // null when fewer than 2 logs
        weightLogs,                // chronological ascending
        bmi:         Number(profile.current_bmi ?? 0),
        height:      profile.height_cm != null ? Number(profile.height_cm) : null,
        targetWeight: profile.target_weight != null ? Number(profile.target_weight) : null,
        palette: profile.palette || 'forest',
        muscleTargets: profile.muscle_targets || {
          brust:20, ruecken:20, schultern:20, bizeps:20, trizeps:20, bauch:20, beine:20,
        },
        dailyQuote:  quote ? { text: quote.text, author: quote.author }
                           : { text: '', author: 'GAINZ Daily' },
        lossAvoidance: profile.show_loss_avoid,
        heatmap,
        sessionsCount,
        muscleSets7d,
        _profile: profile,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => { reload(); }, [reload]);

  // patch helper that also persists relevant fields
  const patch = React.useCallback(async (updater) => {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return next;
    });
  }, []);

  return { data, setData: patch, reload, loading };
};
