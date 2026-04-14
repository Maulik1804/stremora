import api from './api';

export const goalService = {
  getGoals:     ()       => api.get('/goals'),
  getActive:    ()       => api.get('/goals/active'),
  create:       (data)   => api.post('/goals', data),
  update:       (id, d)  => api.patch(`/goals/${id}`, d),
  complete:     (id)     => api.patch(`/goals/${id}/complete`),
  delete:       (id)     => api.delete(`/goals/${id}`),
};
