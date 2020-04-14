import { useState, useRef, useEffect } from "react";
import client from "../../../utils/client";
import Head from "next/head";
import Router from "next/router";
import Link from "next/link";
import Layout, { Header, Content, Sidebar } from "../../../layouts/Inbox";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import List from "../../../components/MessageAccordion";
import styles from "./id.module.css";
import calendarIcon from "../../../assets/calendar.svg";
import checkIcon from "../../../assets/check.svg";
import flagIcon from "../../../assets/flag.svg";
import doubleFlagIcon from "../../../assets/double_flag.svg";
import chevronLeftIcon from "../../../assets/chevron_left.svg";
import chevronRightIcon from "../../../assets/chevron_right.svg";
import checkboxUncheckedIcon from "../../../assets/checkbox_unchecked.svg";
import checkboxCheckedIcon from "../../../assets/checkbox_checked.svg";
import addIcon from "../../../assets/add.svg";
import withAuth from "../../../utils/withAuth";
import classnames from "classnames";
import MessageFrame from "../../../components/MessageFrame";
import { useReferrer } from "../../../components/Referrer";
import NProgress from "nprogress";

export const getServerSideProps = withAuth(async context => {
  const [thread, messages] = await Promise.all([
    client(`/threads/${context.query.id}`, { context }),
    client(`/threads/${context.query.id}/messages`, { context })
  ]);

  return {
    props: {
      account: context.account,
      serverThread: thread,
      messages
    }
  };
});

export default function detailsPage({ account, serverThread, messages }) {
  const [thread, setThread] = useState(serverThread);
  const [showLabels, setShowLabels] = useState(false);
  useEffect(() => {
    setThread(serverThread);
  }, [serverThread]);
  const showToDoList = account.organizationUnit === "label";

  async function updateThread(update) {
    NProgress.start();
    try {
      const updatedThread = await client(`/threads/${thread.id}`, {
        method: "PUT",
        body: update
      });

      setThread(updatedThread);
    } catch (e) {
      console.log(e);
      alert("Something went wrong");
    }
    NProgress.done();
  }

  function addLabel(label) {
    updateThread({
      labels: [...thread.labels.filter(label => label.checked), label]
    });
  }

  function removeLabel(label) {
    updateThread({
      labels: thread.labels.filter(
        ({ id, checked }) => id !== label.id && checked
      )
    });
  }

  const labelInputRef = useRef(null);
  const [labelInput, setLabelInput] = useState("");
  const [showCreateLabelForm, setShowCreateLabelForm] = useState(false);

  useEffect(() => {
    if (showCreateLabelForm) {
      labelInputRef.current.focus();
    }
  }, [showCreateLabelForm]);

  async function createLabel(e) {
    e.preventDefault();
    NProgress.start();
    try {
      const newLabel = await client("/labels", {
        body: { displayName: labelInput }
      });

      setThread({
        ...thread,
        labels: [...thread.labels, newLabel]
      });
    } catch (e) {
      alert("Something went wrong");
    }
    NProgress.done();
    setLabelInput("");
    setShowCreateLabelForm(false);
  }

  const referrer = useReferrer();
  const isOutsideReferrer =
    referrer === null || new URL(referrer).origin !== window.location.origin;

  return (
    <Layout>
      <Head>
        <title>{thread.subject} - Inbox Zero</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <Header account={account} />
      <Sidebar>
        <button
          className={styles.BackButton}
          onClick={() => {
            if (isOutsideReferrer) {
              Router.push("/");
            } else {
              Router.back();
            }
          }}
        >
          <img
            src={chevronLeftIcon}
            alt="Back"
            className={styles.BackButton__icon}
          />{" "}
          <span>Back</span>
        </button>
        <Button>Reply</Button>
        <ul className={styles.Actions}>
          <li className={styles.Action}>
            <button className={styles.Action__button}>
              <span className={styles.Action__icon}>
                <img src={calendarIcon} />
              </span>
              <span>Schedule Meeting »</span>
            </button>
          </li>
          {showToDoList ? (
            <li className={styles.Action}>
              <button
                className={styles.Action__button}
                onClick={() => setShowLabels(!showLabels)}
              >
                <span className={styles.Action__icon}>
                  <img src={checkIcon} />
                </span>
                <span>Add to ToDo List »</span>
              </button>
            </li>
          ) : (
            ""
          )}
          {showLabels ? (
            <li>
              <ul className={styles.Labels}>
                {thread.labels.map(label => (
                  <li className={styles.Label}>
                    <button
                      className={styles.Label__button}
                      onClick={() => {
                        if (label.checked) {
                          removeLabel(label);
                        } else {
                          addLabel(label);
                        }
                      }}
                    >
                      <span className={styles.Label__icon}>
                        <img
                          src={
                            label.checked
                              ? checkboxCheckedIcon
                              : checkboxUncheckedIcon
                          }
                        />
                      </span>
                      <span>{label.displayName}</span>
                    </button>
                  </li>
                ))}
                {showCreateLabelForm ? (
                  <li className={styles.CreateLabelInputWrapper}>
                    <span className={styles.Label__icon}>
                      <img src={checkboxUncheckedIcon} />
                    </span>
                    <form onSubmit={createLabel}>
                      <Input
                        ref={labelInputRef}
                        onChange={e => setLabelInput(e.target.value)}
                      />
                    </form>
                  </li>
                ) : (
                  ""
                )}
                <li>
                  <button
                    className={styles.CreateLabelButton}
                    onClick={() => {
                      setShowCreateLabelForm(!showCreateLabelForm);
                    }}
                  >
                    <span className={styles.CreateLabelButton__icon}>
                      <img src={addIcon} />
                    </span>
                    Create List
                  </button>
                </li>
              </ul>
            </li>
          ) : (
            ""
          )}
          <li
            className={classnames(styles.Action, {
              [styles.disabled]: thread.unread === false
            })}
          >
            <button
              className={styles.Action__button}
              onClick={() => updateThread({ unread: false })}
              disabled={thread.unread === false}
            >
              <span className={styles.Action__icon}>
                <img src={flagIcon} />
              </span>
              <span>Mark as Read »</span>
            </button>
          </li>
          <li
            className={classnames(styles.Action, {
              [styles.disabled]: thread.senderUnread === false
            })}
          >
            <button
              className={styles.Action__button}
              onClick={() => updateThread({ senderUnread: false })}
              disabled={thread.senderUnread === false}
            >
              <span className={styles.Action__icon}>
                <img src={doubleFlagIcon} />
              </span>
              <span>Mark All Emails From Sender as Read »</span>
            </button>
          </li>
        </ul>
      </Sidebar>
      {
        <Content>
          <h2
            className={classnames(styles.Subject, {
              [styles.disabled]: thread.unread === false
            })}
          >
            {thread.subject}
          </h2>
          <List>
            {messages.map((message, i) => (
              <List.Message
                id={message.id}
                active={message.active}
                fromName={message.from[0].name}
                fromEmailAddress={message.from[0].email}
                date={message.date}
                hasAttachments={message.hasAttachments}
                isOpen={i === 1}
                body={message.body}
              />
            ))}
          </List>
          {/*<div className={styles.Contents}>
                <MessageFrame content={message.body} />
                {message.hasAttachments && (
                  <div className={styles.AttachmentWrapper}>
                    {message.files.map(file => (
                      <a
                        href={`/api/files/${file.filename}?id=${file.id}`}
                        className={styles.Attachment}
                        download
                      >
                        {file.filename}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <List divideTop={true}>
                {nextMessages.map(message => (
                  <List.Message
                    id={message.id}
                    active={message.active}
                    fromName={message.from[0].name}
                    fromEmailAddress={message.from[0].email}
                    date={message.date}
                    hasAttachments={message.hasAttachments}
                  />
                ))}
              </List>*/}
          <div className={styles.Pagination}>
            <button
              className={styles.Pagination__button}
              disabled={thread.previousThreadId === null}
              onClick={() =>
                Router.push(
                  `/threads/[id]`,
                  `/threads/${thread.previousThreadId}`
                )
              }
            >
              <img
                className={styles.Pagination__icon}
                src={chevronLeftIcon}
                alt="previous"
              />{" "}
              Previous
            </button>
            <button
              className={styles.Pagination__button}
              disabled={thread.nextThreadId === null}
              onClick={() =>
                Router.push(`/threads/[id]`, `/threads/${thread.nextThreadId}`)
              }
            >
              Next{" "}
              <img
                className={styles.Pagination__icon}
                src={chevronRightIcon}
                alt="next"
              />
            </button>
          </div>
        </Content>
      }
    </Layout>
  );
}
