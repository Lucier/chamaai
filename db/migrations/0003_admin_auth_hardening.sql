-- =====================================================================
--  Login do admin com JWT + bcrypt
--
--  - token_version: o JWT carrega a versão; trocar a senha incrementa e invalida
--    todos os tokens já emitidos, mesmo os que ainda não expiraram.
--  - failed_attempts / locked_until: bloqueio de conta por força bruta, persistido
--    (sobrevive a reinício e vale para várias réplicas, ao contrário do limitador em memória).
--  - last_login_at: só informativo.
--  - admin_sessions passa a guardar o hash do `jti` do JWT (lista de sessões válidas),
--    para o logout revogar de verdade.
-- =====================================================================

alter table admins
  add column token_version   int         not null default 0,
  add column failed_attempts int         not null default 0 check (failed_attempts >= 0),
  add column locked_until    timestamptz,
  add column last_login_at   timestamptz;

-- Os cookies antigos eram tokens opacos e não são JWT válidos: nenhuma dessas sessões
-- pode mais ser usada, então saem agora em vez de esperar expirar.
delete from admin_sessions;
