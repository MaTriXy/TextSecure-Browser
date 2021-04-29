// Copyright 2021 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import { connect } from 'react-redux';

import { StateType } from '../reducer';
import {
  ConversationDetails,
  StateProps,
} from '../../components/conversation/conversation-details/ConversationDetails';
import {
  getComposableContacts,
  getConversationByIdSelector,
} from '../selectors/conversations';
import { GroupV2Membership } from '../../components/conversation/conversation-details/ConversationDetailsMembershipList';
import { getIntl } from '../selectors/user';
import { MediaItemType } from '../../components/LightboxGallery';
import { isConversationUnregistered } from '../../util/isConversationUnregistered';
import { assert } from '../../util/assert';

export type SmartConversationDetailsProps = {
  addMembers: (conversationIds: ReadonlyArray<string>) => Promise<void>;
  conversationId: string;
  hasGroupLink: boolean;
  loadRecentMediaItems: (limit: number) => void;
  setDisappearingMessages: (seconds: number) => void;
  showAllMedia: () => void;
  showContactModal: (conversationId: string) => void;
  showGroupLinkManagement: () => void;
  showGroupV2Permissions: () => void;
  showPendingInvites: () => void;
  showLightboxForMedia: (
    selectedMediaItem: MediaItemType,
    media: Array<MediaItemType>
  ) => void;
  updateGroupAttributes: (
    _: Readonly<{
      avatar?: undefined | ArrayBuffer;
      title?: string;
    }>
  ) => Promise<void>;
  onBlock: () => void;
  onLeave: () => void;
};

const mapStateToProps = (
  state: StateType,
  props: SmartConversationDetailsProps
): StateProps => {
  const conversationSelector = getConversationByIdSelector(state);
  const conversation = conversationSelector(props.conversationId);
  assert(
    conversation,
    '<SmartConversationDetails> expected a conversation to be found'
  );

  const canEditGroupInfo =
    conversation && conversation.canEditGroupInfo
      ? conversation.canEditGroupInfo
      : false;

  const memberships = (conversation.memberships || []).reduce(
    (result: Array<GroupV2Membership>, membership) => {
      const member = conversationSelector(membership.conversationId);
      if (!member || isConversationUnregistered(member)) {
        return result;
      }
      return [...result, { isAdmin: membership.isAdmin, member }];
    },
    []
  );

  const isAdmin = Boolean(conversation?.areWeAdmin);
  const candidateContactsToAdd = getComposableContacts(state);

  return {
    ...props,
    canEditGroupInfo,
    candidateContactsToAdd,
    conversation,
    i18n: getIntl(state),
    isAdmin,
    memberships,
  };
};

const smart = connect(mapStateToProps);

export const SmartConversationDetails = smart(ConversationDetails);
