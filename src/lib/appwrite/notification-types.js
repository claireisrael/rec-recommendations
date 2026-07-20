/**
 * @typedef {'l1_review_requested' | 'feedback_responded' | 'superadmin_review_requested' | 'action_reviewed' | 'action_published' | 'changes_requested' | 'l1_edited_and_forwarded' | 'final_returned_to_l1' | 'publisher_returned_fyi' | 'responsibility_assigned'} NotificationType
 */

/**
 * @typedef {Object} AppNotification
 * @property {string} [$id]
 * @property {string} userId
 * @property {NotificationType} type
 * @property {string} title
 * @property {string} body
 * @property {string} [recommendationId]
 * @property {string} [actionId]
 * @property {boolean} read
 * @property {string} [$createdAt]
 */

export {};
