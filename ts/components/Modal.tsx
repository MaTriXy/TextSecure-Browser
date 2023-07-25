// Copyright 2021 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import type { ReactElement, ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { noop } from 'lodash';
import { animated } from '@react-spring/web';

import type { LocalizerType } from '../types/Util';
import { ModalHost } from './ModalHost';
import type { Theme } from '../util/theme';
import { assertDev } from '../util/assert';
import { getClassNamesFor } from '../util/getClassNamesFor';
import { useAnimated } from '../hooks/useAnimated';
import { useHasWrapped } from '../hooks/useHasWrapped';
import * as log from '../logging/log';
import {
  isOverflowing,
  isScrolled,
  useScrollObserver,
} from '../hooks/useSizeObserver';

type PropsType = {
  children: ReactNode;
  modalName: string;
  hasXButton?: boolean;
  hasHeaderDivider?: boolean;
  hasFooterDivider?: boolean;
  i18n: LocalizerType;
  modalFooter?: JSX.Element;
  moduleClassName?: string;
  onBackButtonClick?: () => unknown;
  onClose?: () => void;
  title?: ReactNode;
  useFocusTrap?: boolean;
  padded?: boolean;
};

export type ModalPropsType = PropsType & {
  noTransform?: boolean;
  noMouseClose?: boolean;
  theme?: Theme;
};

const BASE_CLASS_NAME = 'module-Modal';

export function Modal({
  children,
  modalName,
  hasXButton,
  i18n,
  modalFooter,
  moduleClassName,
  noMouseClose,
  onBackButtonClick,
  onClose = noop,
  theme,
  title,
  useFocusTrap,
  hasHeaderDivider = false,
  hasFooterDivider = false,
  noTransform = false,
  padded = true,
}: Readonly<ModalPropsType>): JSX.Element | null {
  const { close, isClosed, modalStyles, overlayStyles } = useAnimated(
    onClose,

    // `background-position: fixed` cannot properly detect the viewport when
    // the parent element has `transform: translate*`. Even though it requires
    // layout recalculation - use `margin-top` if asked by the embedder.
    noTransform
      ? {
          getFrom: () => ({ opacity: 0, marginTop: '48px' }),
          getTo: isOpen =>
            isOpen
              ? { opacity: 1, marginTop: '0px' }
              : { opacity: 0, marginTop: '48px' },
        }
      : {
          getFrom: () => ({ opacity: 0, transform: 'translateY(48px)' }),
          getTo: isOpen =>
            isOpen
              ? { opacity: 1, transform: 'translateY(0px)' }
              : { opacity: 0, transform: 'translateY(48px)' },
        }
  );

  useEffect(() => {
    if (!isClosed) {
      return noop;
    }

    const timer = setTimeout(() => {
      log.error(`Modal ${modalName} is closed, but still visible`);
      assertDev(false, `Invisible modal ${modalName}`);
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [modalName, isClosed]);

  if (isClosed) {
    return null;
  }

  return (
    <ModalHost
      modalName={modalName}
      moduleClassName={moduleClassName}
      noMouseClose={noMouseClose}
      onClose={close}
      onEscape={onBackButtonClick}
      overlayStyles={overlayStyles}
      theme={theme}
      useFocusTrap={useFocusTrap}
    >
      <animated.div style={modalStyles}>
        <ModalPage
          modalName={modalName}
          hasXButton={hasXButton}
          i18n={i18n}
          modalFooter={modalFooter}
          moduleClassName={moduleClassName}
          onBackButtonClick={onBackButtonClick}
          onClose={close}
          title={title}
          padded={padded}
          hasHeaderDivider={hasHeaderDivider}
          hasFooterDivider={hasFooterDivider}
        >
          {children}
        </ModalPage>
      </animated.div>
    </ModalHost>
  );
}

type ModalPageProps = Readonly<{
  // should be the one provided by PagedModal
  onClose: () => void;
}> &
  Omit<Readonly<PropsType>, 'onClose'>;

/**
 * Represents a single instance (or page) of a modal window.
 *
 * It should not be used by itself, either wrap it with PagedModal,
 * render it in a component that has PagedModal as an ancestor, or
 * use Modal instead.
 *
 * It does not provide open/close animation.
 *
 * NOTE: When used in conjunction with PagedModal (almost always the case):
 * onClose" handler should be the one provided by the parent PagedModal,
 * not one that has any logic. If you have some logic to execute when the
 * modal closes, pass it to PagedModal.
 */
export function ModalPage({
  children,
  hasXButton,
  i18n,
  modalFooter,
  moduleClassName,
  onBackButtonClick,
  onClose,
  title,
  padded = true,
  hasHeaderDivider = false,
  hasFooterDivider = false,
}: ModalPageProps): JSX.Element {
  const modalRef = useRef<HTMLDivElement | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const bodyInnerRef = useRef<HTMLDivElement>(null);

  const [scrolled, setScrolled] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const hasHeader = Boolean(hasXButton || title || onBackButtonClick);
  const getClassName = getClassNamesFor(BASE_CLASS_NAME, moduleClassName);

  useScrollObserver(bodyRef, bodyInnerRef, scroll => {
    setScrolled(isScrolled(scroll));
    setHasOverflow(isOverflowing(scroll));
  });

  return (
    <>
      {/* We don't want the click event to propagate to its container node. */}
      {/* eslint-disable-next-line max-len */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        className={classNames(
          getClassName(''),
          getClassName(hasHeader ? '--has-header' : '--no-header'),
          Boolean(modalFooter) && getClassName('--has-footer'),
          padded && getClassName('--padded'),
          hasHeaderDivider && getClassName('--header-divider'),
          hasFooterDivider && getClassName('--footer-divider')
        )}
        ref={modalRef}
        onClick={event => {
          event.stopPropagation();
        }}
      >
        {hasHeader && (
          <div
            className={classNames(
              getClassName('__header'),
              onBackButtonClick
                ? getClassName('__header--with-back-button')
                : null
            )}
          >
            {onBackButtonClick && (
              <button
                aria-label={i18n('icu:back')}
                className={getClassName('__back-button')}
                onClick={onBackButtonClick}
                tabIndex={0}
                type="button"
              />
            )}
            {title && (
              <h1
                className={classNames(
                  getClassName('__title'),
                  hasXButton ? getClassName('__title--with-x-button') : null
                )}
              >
                {title}
              </h1>
            )}
            {hasXButton && !title && (
              <div className={getClassName('__title')} />
            )}
            {hasXButton && (
              <button
                aria-label={i18n('icu:close')}
                className={getClassName('__close-button')}
                onClick={onClose}
                tabIndex={0}
                type="button"
              />
            )}
          </div>
        )}
        <div
          className={classNames(
            getClassName('__body'),
            scrolled ? getClassName('__body--scrolled') : null,
            hasOverflow || scrolled ? getClassName('__body--overflow') : null
          )}
          ref={bodyRef}
        >
          <div ref={bodyInnerRef}>{children}</div>
        </div>
        {modalFooter && <Modal.ButtonFooter>{modalFooter}</Modal.ButtonFooter>}
      </div>
    </>
  );
}

function ButtonFooter({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  const [ref, hasWrapped] = useHasWrapped<HTMLDivElement>();

  const className = getClassNamesFor(BASE_CLASS_NAME)('__button-footer');

  return (
    <div
      className={classNames(
        className,
        hasWrapped ? `${className}--one-button-per-line` : undefined
      )}
      ref={ref}
    >
      {children}
    </div>
  );
}
Modal.ButtonFooter = ButtonFooter;

type PagedModalProps = Readonly<{
  modalName: string;
  children: RenderModalPage;
  moduleClassName?: string;
  onClose?: () => void;
  useFocusTrap?: boolean;
  noMouseClose?: boolean;
  theme?: Theme;
}>;

/**
 * Provides modal animation and click to close functionality to a
 * ModalPage descendant.
 *
 * Useful when we want to swap between different ModalPages (possibly
 * rendered by different components) without triggering an open/close
 * transition animation.
 */
export function PagedModal({
  modalName,
  children,
  moduleClassName,
  noMouseClose,
  onClose = noop,
  theme,
  useFocusTrap,
}: PagedModalProps): JSX.Element | null {
  const { close, isClosed, modalStyles, overlayStyles } = useAnimated(onClose, {
    getFrom: () => ({ opacity: 0, transform: 'translateY(48px)' }),
    getTo: isOpen =>
      isOpen
        ? { opacity: 1, transform: 'translateY(0px)' }
        : { opacity: 0, transform: 'translateY(48px)' },
  });

  useEffect(() => {
    if (!isClosed) {
      return noop;
    }

    const timer = setTimeout(() => {
      log.error(`PagedModal ${modalName} is closed, but still visible`);
      assertDev(false, `Invisible paged modal ${modalName}`);
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [modalName, isClosed]);

  if (isClosed) {
    return null;
  }

  return (
    <ModalHost
      modalName={modalName}
      moduleClassName={moduleClassName}
      noMouseClose={noMouseClose}
      onClose={close}
      overlayStyles={overlayStyles}
      theme={theme}
      useFocusTrap={useFocusTrap}
    >
      <animated.div style={modalStyles}>{children(close)}</animated.div>
    </ModalHost>
  );
}

export type RenderModalPage = (onClose: () => void) => JSX.Element;
