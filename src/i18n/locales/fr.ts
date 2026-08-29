import type { Phrase } from '../translate';

/**
 * FRANÇAIS (Québec).
 *
 * Canadian French, not Parisian: this app is used in Quebec, where the
 * financial vocabulary differs from France's.
 *
 * THE TRAP THIS FILE HAD TO AVOID
 * -------------------------------
 * "I pay it" cannot be translated literally. The object is sometimes a
 * *facture* (feminine) and sometimes an *abonnement* (masculine), so "Je la
 * paie" is wrong half the time and "Je le paie" the other half. Every such
 * phrase here is rewritten to drop the pronoun — "Je paie moi-même" — which
 * is also simply better French.
 *
 * "Auto-pay" is *prélèvement automatique*: 22 characters against 8 in English,
 * which destroys a badge on a phone. Shortened where it is a badge, written
 * out where there is room.
 */
export const fr: Record<string, Phrase> = {
  'common.save':        'Enregistrer',
  'common.cancel':      'Annuler',
  'common.delete':      'Supprimer',
  'common.close':       'Fermer',
  'common.edit':        'Modifier',
  'common.add':         'Ajouter',
  'common.done':        'Terminé',
  'common.back':        'Retour',
  'common.retry':       'Réessayer',
  'common.undo':        'Annuler',
  'common.today':       "aujourd'hui",
  'common.tomorrow':    'demain',
  'common.yesterday':   'hier',
  // Zero is singular in French: « dans 0 jour ».
  'common.inDays':      { one: 'dans {count} jour', other: 'dans {count} jours' },
  'common.oops':        'Oups',
  'common.somethingWrong': "Une erreur s'est produite. Veuillez réessayer.",

  'nav.home':      'Accueil',
  'nav.more':      'Plus',
  'nav.settings':  'Réglages',
  'nav.spending':  'Dépenses',
  'nav.income':    'Revenus',
  'nav.bills':     'Factures et abonnements',
  'nav.goals':     "Objectifs d'épargne",
  'nav.debt':      'Suivi des dettes',
  'nav.calendar':  'Calendrier',
  'nav.breakdown': 'Bilan du mois',
  'nav.activity':  "Ce qui s'est passé",
  'nav.currency':  'Convertisseur de devises',
  'nav.profile':   'Profil',

  // « Reste à dépenser » is what French budgeting apps actually call this.
  // A literal "dépense sécuritaire" would read as safety advice.
  'money.safeToSpend':      'Reste à dépenser',
  'money.yourSafeToSpend':  'Votre reste à dépenser',
  'money.moneyIn':          "Entrées d'argent",
  'money.moneyOut':         "Sorties d'argent",
  'money.moneyLeftOver':    'Argent restant',
  'money.overBudget':       'dépassement ce mois-ci',
  'money.everydaySpending': 'Dépenses courantes',
  'money.billsPaid':        'Factures payées',
  'money.billsYouOwe':      'Factures à payer',
  'money.savingTowardGoals': 'Épargne pour vos objectifs',
  'money.moneyInThisMonth': 'Argent entré ce mois-ci',
  'money.perDay':           '{amount} par jour',

  'home.quickAdd':        'Ajout rapide',
  'home.addExpense':      'Ajouter une dépense',
  'home.addIncome':       'Ajouter un revenu',
  'home.addBill':         'Ajouter une facture',
  'home.addToGoal':       'Ajouter à un objectif',
  'home.comingUp':        'À venir',
  'home.whatHappened':    "Ce qui s'est passé",
  'home.yourGoals':       'Vos objectifs',
  'home.noFeaturedGoal':  'Aucun objectif en vedette',
  'home.pinAGoal':        'Épinglez un objectif pour suivre vos progrès ici.',
  'home.browse':          'Parcourir',
  'home.viewBreakdown':   'Voir le bilan complet',
  'home.whyThisNumber':   'Pourquoi ce montant ?',
  'home.seeAll':          'Tout voir',

  'bills.title':            'Factures et abonnements',
  'bills.bills':            'Factures',
  'bills.subscriptions':    'Abonnements',
  'bills.stillToPay':       '{amount} encore à payer',
  'bills.noBills':          'Aucune facture — touchez pour en ajouter une',
  'bills.noSubscriptions':  'Aucun abonnement — touchez pour en ajouter un',
  'bills.thisMonth':        'Factures du mois',
  'bills.paid':             'Payées',
  'bills.stillDue':         'À payer',
  'bills.paidOut':          'Montant payé',
  'bills.name':             'Nom',
  'bills.amount':           'Montant',
  'bills.addNew':           'Ajouter',
  'bills.editBill':         'Modifier la facture',
  'bills.editSubscription': "Modifier l'abonnement",
  'bills.deleteBill':       'Supprimer cette facture ?',
  'bills.deleteBillBody':   'Elle sera retirée de votre liste de factures.',
  'bills.deleteSub':        'Retirer cet abonnement ?',
  'bills.deleteSubBody':    "Il sera retiré de votre liste d'abonnements.",

  // No object pronoun anywhere below — see the note at the top of this file.
  'pay.question':      'Comment est-ce payé ?',
  'pay.iPayIt':        'Je paie moi-même',
  'pay.iPayItHelp':    'Vous confirmerez le paiement.',
  'pay.autoPay':       'Prélèvement auto',
  'pay.autoPayHelp':   'Le paiement se fait tout seul.',
  'pay.assumeIt':      "Ne plus me demander chaque mois — considérer que c'est payé",

  'state.dueOn':          'À payer {when}',
  'state.autoPayOn':      'Prélèvement {when}',
  'state.autoChargeOn':   'Facturation auto {when}',
  'state.checkPayment':   'Vérifier le paiement',
  'state.paid':           'Payé',
  'state.paidAutomatically': 'Payé automatiquement',
  'state.notPaidStillOwed':  'Non payé — toujours dû',
  'state.youPay':         'VOUS PAYEZ',
  'state.autoPayBadge':   'AUTOMATIQUE',
  'state.markPaid':       'Marquer payé',
  'state.check':          'Vérifier',

  'verify.expected':       'Un montant de {amount} devait sortir. Est-ce le cas ?',
  'verify.yesItWasPaid':   "Oui, c'est payé",
  'verify.differentAmount': 'Montant différent',
  'verify.didntGoThrough': 'Le paiement a échoué',
  'verify.askMeLater':     'Plus tard',

  'expense.add':        'Ajouter une dépense',
  'expense.edit':       'Modifier la dépense',
  'expense.amount':     'Montant',
  'expense.category':   'Catégorie',
  'expense.note':       'Note',
  'expense.date':       'Date',
  'expense.whoWasIt':   "C'était où ?",
  'expense.deleteThis': 'Supprimer cette dépense ?',
  'expense.noneYet':    "Aucune dépense pour l'instant",

  'breakdown.whatMoneyOutWas': 'Ce que représentent les sorties',
  'breakdown.whereMoneyWent':  'Où est allé votre argent',
  'breakdown.totalOut':        'Total sorti',
  'breakdown.everythingElse':  'Tout le reste',
  'breakdown.nothingThisMonth': 'Aucune dépense enregistrée ce mois-ci.',
  'breakdown.moreOutThanIn': "Il est sorti plus d'argent qu'il n'en est entré ce mois-ci. Voici où il est allé.",
  'breakdown.nearlyAllOut':  'Presque tout ce qui est entré est ressorti ce mois-ci.',
  'breakdown.someLeftOver':  'Une partie de ce qui est entré est encore là ce mois-ci.',
  'breakdown.mostLeftOver':  'La majeure partie de ce qui est entré est encore là ce mois-ci.',

  'capture.photograph':     'Photographiez un reçu ou une facture',
  'capture.retake':         'Reprendre',
  'capture.usePhoto':       'Utiliser la photo',
  'capture.reading':        'Lecture de votre document…',
  'capture.onDevice':       "Sur votre appareil — rien n'est téléversé.",
  'capture.checkThis':      'À VÉRIFIER',
  'capture.thisIsA':        'CECI EST',
  'capture.expense':        'Dépense',
  'capture.bill':           'Facture',
  'capture.merchant':       'Commerçant',
  'capture.payee':          'Bénéficiaire',
  'capture.tapToAdd':       'Touchez pour ajouter',
  'capture.tapToCorrect':   "Touchez n'importe quel champ pour le corriger. Votre photo reste jointe.",
  'capture.continue':       'Continuer',
  'capture.enterManually':  'Saisir manuellement',
  'capture.couldntRead':    "Nous n'avons pas pu lire ce document automatiquement. Votre photo est enregistrée — choisissez où elle va et saisissez les détails.",
  'capture.cameraNeeded':   'Accès à la caméra requis',
  'capture.cameraWhy':      'PeggyBank utilise la caméra pour photographier vos reçus et factures. Les images restent sur votre appareil.',
  'capture.allowCamera':    'Autoriser la caméra',

  'settings.title':      'Réglages',
  'settings.appearance': 'Apparence',
  'settings.language':   'Langue',
  'settings.export':     'Exportation et sauvegarde',
  'settings.share':      'Partager avec un ami',
  'settings.notifications': 'NOTIFICATIONS',
  'settings.reminders':  'Rappels',
  'settings.testReminder': 'Envoyer un rappel test',
  'language.savedOnPhone': "Votre choix est enregistré sur ce téléphone et n'est jamais partagé.",
};
