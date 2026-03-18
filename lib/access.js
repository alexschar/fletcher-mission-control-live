const ACTORS = {
  alex: { id: 'alex', name: 'Alex' },
  fletcher: { id: 'fletcher', name: 'Fletcher' },
  sawyer: { id: 'sawyer', name: 'Sawyer' },
};

function getActorFromRequest(request) {
  const raw = request.headers.get('x-mc-actor') || request.headers.get('x-mission-control-actor') || 'sawyer';
  const actor = String(raw).toLowerCase();
  return ACTORS[actor] ? actor : 'sawyer';
}

function requireActor(request, allowedActors) {
  const actor = getActorFromRequest(request);
  if (!allowedActors.includes(actor)) {
    const error = new Error('Forbidden');
    error.status = 403;
    error.actor = actor;
    throw error;
  }
  return actor;
}

function canViewAudit(actor) {
  return ['alex', 'fletcher'].includes(actor);
}

function canCreateAudit(actor) {
  return actor === 'fletcher';
}

module.exports = {
  ACTORS,
  getActorFromRequest,
  requireActor,
  canViewAudit,
  canCreateAudit,
};
