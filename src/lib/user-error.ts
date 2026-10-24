import { translate, type MessageKey, type Vars } from "@/i18n";

/**
 * A reason an action was refused that the user can act on. It carries a dictionary key, so
 * server actions show it in the user's language: `t(error.key, error.vars)`. The message is
 * the English text, for logs and tests.
 */
export class UserError extends Error {
  constructor(
    readonly key: MessageKey,
    readonly vars?: Vars,
  ) {
    super(translate("en", key, vars));
  }
}
