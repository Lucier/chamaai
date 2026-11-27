-- =====================================================================
--  Remove "Bairro onde atende" e "Como você cobra?" do cadastro de prestador.
--
--  - providers.neighborhood e providers.price_unit deixam de existir
--    (os CHECKs de coluna caem junto com elas).
--  - quotes.neighborhood NÃO muda: é o bairro do CLIENTE no pedido de orçamento.
--  - Sem a unidade, "a combinar" passa a ser price = 0. O cadastro já gravava 0
--    nesse caso; o update abaixo só garante o mesmo para qualquer linha antiga.
-- =====================================================================

update providers set price = 0 where price_unit = 'a combinar' and price <> 0;

alter table providers drop column neighborhood;
alter table providers drop column price_unit;
