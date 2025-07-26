import { supabase } from './supabase';

// データベーステーブルの存在確認
export async function checkDatabaseTables() {
  try {
    console.log('Checking database tables...');
    
    // teamsテーブルの確認
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('count')
      .limit(1);
    
    console.log('Teams table check:', { data: teamsData, error: teamsError });
    
    if (teamsError) {
      console.error('Teams table error:', teamsError);
      return { teams: false, error: teamsError.message };
    }
    
    // team_membersテーブルの確認
    const { data: membersData, error: membersError } = await supabase
      .from('team_members')
      .select('count')
      .limit(1);
    
    console.log('Team members table check:', { data: membersData, error: membersError });
    
    if (membersError) {
      console.error('Team members table error:', membersError);
      return { team_members: false, error: membersError.message };
    }
    
    return { teams: true, team_members: true, error: null };
  } catch (err) {
    console.error('Database check failed:', err);
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}