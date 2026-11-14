export async function findOwnerMembership(database, userId, companyName = "UK EXIM ENTERPRISES") {
  if (!userId) return null;
  const result = await database.query(
    `SELECT c.id::text AS company_id, c.name AS company_name, m.role
     FROM auth.company_memberships AS m
     INNER JOIN auth."user" AS u ON u.id = m.user_id
     INNER JOIN public.companies AS c ON c.id = m.company_id
     WHERE m.user_id = $1 AND m.role = 'owner' AND c.name = $2
     LIMIT 1`,
    [userId, companyName],
  );
  return result.rows[0] ?? null;
}

export async function resolveOwnerContext(database, session, companyName = "UK EXIM ENTERPRISES") {
  if (!session?.user?.id) return null;
  const company = await findOwnerMembership(database, session.user.id, companyName);
  if (!company) return null;
  return { session, company };
}
