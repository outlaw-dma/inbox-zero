import NextError from "next/error";
import fetch from "isomorphic-unfetch";
import { Fragment, useState, useRef, useEffect } from "react";
import request from "../../../utils/request";
import Head from "next/head";
import Router from "next/router";
import Link from "next/link";
import Layout, { Header, Content, Sidebar } from "../../../layouts/Inbox";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import Accordion from "../../../components/MessageAccordion";
import styles from "./id.module.css";
import calendarIcon from "../../../assets/calendar.svg";
import checkIcon from "../../../assets/check.svg";
import flagIcon from "../../../assets/flag.svg";
import removeIcon from "../../../assets/remove.svg";
import doubleFlagIcon from "../../../assets/double_flag.svg";
import chevronLeftIcon from "../../../assets/chevron_left.svg";
import chevronRightIcon from "../../../assets/chevron_right.svg";
import checkboxUncheckedIcon from "../../../assets/checkbox_unchecked.svg";
import checkboxCheckedIcon from "../../../assets/checkbox_checked.svg";
import addAttachmentIcon from "../../../assets/add_attachment.svg";
import addIcon from "../../../assets/add.svg";
import schedulePageIcon from "../../../assets/schedule_page.svg";
import withAuth from "../../../utils/withAuth";
import classnames from "classnames";
import Attachment from "../../../components/Attachment";
import { useReferrer } from "../../../components/Referrer";
import dynamic from "next/dynamic";
import NProgress from "nprogress";

function loadScript(src) {
  const body = document.body || document.querySelector("body");
  const script = document.createElement("script");
  script.src = src;

  body.appendChild(script);
}

function onRemove(element, callback) {
  const parent = element.parentNode;
  if (!parent) throw new Error("The node must already be attached");

  const obs = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const el of mutation.removedNodes) {
        if (el === element) {
          obs.disconnect();
          callback();
        }
      }
    }
  });
  obs.observe(parent, {
    childList: true
  });
}

const Quill = dynamic(import("react-quill"), {
  ssr: false,
  loading: () => <div style={{ height: 340 }} />
});

const Editor = props => {
  return (
    <div className={styles.Editor}>
      <Quill theme="snow" {...props} />
    </div>
  );
};

function Recipients(props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gridColumnGap: "24px",
        gridRowGap: "12px",
        padding: "0 24px"
      }}
      {...props}
    />
  );
}

function ReplySidebar({ triggerSubmit, setShowReply, state, setState }) {
  const fileInputRef = useRef(null);

  async function handleFileChange(event) {
    NProgress.start();
    const formData = new FormData();
    formData.append("upload", event.target.files[0]);

    const response = await fetch("/api/files", {
      method: "POST",
      body: formData
    });

    const file = await response.json();
    setState({
      ...state,
      files: [...state.files, file]
    });
    NProgress.done();
  }

  async function deleteFile({ filename, id }) {
    await request(`/files/${filename}?id=${id}`, {
      method: "DELETE"
    });

    setState({
      ...state,
      files: state.files.filter(file => file.id !== id)
    });
  }

  return (
    <Sidebar>
      <BackButton
        onClick={() => {
          NProgress.start();
          setShowReply(false);
          NProgress.done();
        }}
      />
      <Button onClick={triggerSubmit}>Send</Button>
      <ActionList>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <Action
          icon={addAttachmentIcon}
          onClick={() => {
            fileInputRef.current.click();
          }}
        >
          Add Attachment »
        </Action>
        {state.files.map(file => {
          return (
            <Action
              key={file.id}
              icon={removeIcon}
              onClickIcon={() => {
                deleteFile(file);
              }}
            >
              <Attachment {...file} />
            </Action>
          );
        })}
      </ActionList>
    </Sidebar>
  );
}

function ReplyForm({ state, setState }) {
  const [showSecondaryEmails, setShowSecondaryEmails] = useState(
    state.cc.length > 0 || state.bcc.length > 0
  );

  return (
    <Fragment>
      <Recipients>
        <Input
          value={state.to}
          placeholder="To"
          onChange={e =>
            setState({
              ...state,
              to: e.target.value
            })
          }
        />
        <div>
          <button
            className={styles.ShowSecondaryEmailsButton}
            onClick={() => {
              setShowSecondaryEmails(!showSecondaryEmails);
            }}
          >
            CC BCC
          </button>
        </div>
        {showSecondaryEmails ? (
          <Fragment>
            <Input
              value={state.cc}
              placeholder="Cc"
              onChange={e =>
                setState({
                  ...state,
                  cc: e.target.value
                })
              }
            />
            <Input
              value={state.bcc}
              placeholder="Bcc"
              onChange={e =>
                setState({
                  ...state,
                  bcc: e.target.value
                })
              }
            />
          </Fragment>
        ) : (
          ""
        )}
      </Recipients>
      <div style={{ padding: "0 24px" }}>
        <Editor
          value={state.body}
          onChange={body => {
            setState({
              ...state,
              body
            });
          }}
        />
      </div>
    </Fragment>
  );
}

function BackButton({ onClick }) {
  return (
    <button className={styles.BackButton} onClick={onClick}>
      <img
        src={chevronLeftIcon}
        alt="Back"
        className={styles.BackButton__icon}
      />{" "}
      <span>Back</span>
    </button>
  );
}

function Subject({ unread, children }) {
  return (
    <h2
      className={classnames(styles.Subject, {
        [styles.unread]: unread
      })}
    >
      {children}
    </h2>
  );
}

function ActionList({ children }) {
  return <ul className={styles.Actions}>{children}</ul>;
}

function Labels({ labels, addLabel, removeLabel, createLabel }) {
  const labelInputRef = useRef(null);
  const [labelInput, setLabelInput] = useState("");
  const [showCreateLabelForm, setShowCreateLabelForm] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    await createLabel(labelInput);
    setLabelInput("");
    setShowCreateLabelForm(false);
  }

  useEffect(() => {
    if (showCreateLabelForm) {
      labelInputRef.current.focus();
    }
  }, [showCreateLabelForm]);

  return (
    <ul className={styles.Labels}>
      {labels.map(label => (
        <li className={styles.Label} key={label.id}>
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
                  label.checked ? checkboxCheckedIcon : checkboxUncheckedIcon
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
          <form onSubmit={handleSubmit}>
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
  );
}

function Action({ disabled, icon, onClick, onClickIcon = null, children }) {
  return (
    <li className={styles.Action}>
      <button
        className={styles.Action__button}
        onClick={onClick}
        disabled={disabled}
      >
        <span className={styles.Action__icon} onClick={onClickIcon}>
          <img src={icon} />
        </span>
        <span>{children}</span>
      </button>
    </li>
  );
}

function SchedulerPages({
  account,
  schedulerPages,
  setSchedulerPages,
  setShowReply,
  state,
  setState
}) {
  return (
    <ul className={styles.SchedulePages}>
      {schedulerPages.map(page => (
        <li className={styles.SchedulePage} key={page.slug}>
          <span className={styles.SchedulePage__icon}>
            <img src={schedulePageIcon} />
          </span>
          <span>
            <button
              className={styles.SchedulePage__button}
              onClick={() => {
                NProgress.start();
                setShowReply(true);
                NProgress.done();
                setState({
                  ...state,
                  body: `<a href="https://schedule.nylas.com/${page.slug}">${page.name}</a>`
                });
              }}
            >
              {page.name}
            </button>
            <a
              className={styles.SchedulePage__link}
              target="_blank"
              href={`https://schedule.nylas.com/${page.slug}`}
            >
              schedule.nylas.com/{page.slug}
            </a>
          </span>
        </li>
      ))}
      <li>
        <button
          className={styles.ScheduleEditorButton}
          onClick={() => {
            nylas.scheduler.show({
              auth: {
                accessToken: account.accessToken
              },
              style: {
                // Style the schedule editor
                tintColor: "#32325d",
                backgroundColor: "white"
              },
              defaults: {
                event: {
                  title: "30-min Coffee Meeting",
                  duration: 30
                }
              }
            });

            onRemove(document.querySelector(".nylas-backdrop"), async () => {
              const newSchedulerPages = await fetch(
                "https://schedule.api.nylas.com/manage/pages",
                {
                  headers: { Authorization: `Bearer ${account.accessToken}` }
                }
              ).then(response => response.json());

              setSchedulerPages(newSchedulerPages);
            });
          }}
        >
          Open Schedule Editor »
        </button>
      </li>
    </ul>
  );
}

function DetailsSidebar({
  account,
  thread,
  setThread,
  setShowReply,
  schedulerPages,
  setSchedulerPages,
  state,
  setState
}) {
  const [showLabels, setShowLabels] = useState(false);
  const [showSchedulerPages, setShowSchedulerPages] = useState(false);
  const showToDoList = account.organizationUnit === "label";

  async function updateThread(update) {
    NProgress.start();
    try {
      const updatedThread = await request(`/threads/${thread.id}`, {
        method: "PUT",
        body: update
      });

      setThread({
        ...thread,
        ...update
      });
    } catch (e) {
      console.log(e);
      alert("Something went wrong");
    }
    NProgress.done();
  }

  function addLabel(newLabel) {
    updateThread({
      labels: thread.labels.map(label => {
        if (newLabel.id === label.id) {
          return {
            ...label,
            checked: true
          };
        }

        return label;
      })
    });
  }

  function removeLabel(oldLabel) {
    updateThread({
      labels: thread.labels.map(label => {
        if (oldLabel.id === label.id) {
          return {
            ...label,
            checked: false
          };
        }

        return label;
      })
    });
  }

  async function createLabel(displayName) {
    NProgress.start();
    try {
      const newLabel = await request("/labels", {
        body: { displayName }
      });

      setThread({
        ...thread,
        labels: [...thread.labels, newLabel]
      });
    } catch (e) {
      alert("Something went wrong");
    }
    NProgress.done();
  }

  const referrer = useReferrer();

  return (
    <Sidebar>
      <BackButton
        onClick={() => {
          const isOutsideReferrer =
            referrer === null ||
            new URL(referrer).origin !== window.location.origin;

          const fromListPage =
            !isOutsideReferrer && new URL(referrer).pathname === "/";

          if (isOutsideReferrer || !fromListPage) {
            Router.push("/");
          } else {
            Router.back();
          }
        }}
      />
      <Button
        onClick={() => {
          NProgress.start();
          setShowReply(true);
          NProgress.done();
        }}
      >
        Reply
      </Button>
      <ActionList>
        <Action
          icon={calendarIcon}
          onClick={() => {
            setShowSchedulerPages(!showSchedulerPages);
          }}
        >
          Schedule Meeting »
        </Action>
        {showSchedulerPages ? (
          <li>
            <SchedulerPages
              schedulerPages={schedulerPages}
              setSchedulerPages={setSchedulerPages}
              account={account}
              setShowReply={setShowReply}
              state={state}
              setState={setState}
            />
          </li>
        ) : (
          ""
        )}
        {showToDoList ? (
          <Action icon={checkIcon} onClick={() => setShowLabels(!showLabels)}>
            Add to ToDo List »
          </Action>
        ) : (
          ""
        )}
        {showLabels ? (
          <li>
            <Labels
              labels={thread.labels}
              addLabel={addLabel}
              removeLabel={removeLabel}
              createLabel={createLabel}
            />
          </li>
        ) : (
          ""
        )}
        <Action
          icon={flagIcon}
          disabled={thread.unread === false}
          onClick={() => updateThread({ unread: false })}
        >
          Mark as Read »
        </Action>
        <Action
          icon={doubleFlagIcon}
          disabled={thread.senderUnread === false}
          onClick={() => updateThread({ senderUnread: false })}
        >
          Mark All Emails From Sender as Read »
        </Action>
      </ActionList>
    </Sidebar>
  );
}

export const getServerSideProps = withAuth(async context => {
  try {
    const [thread, schedulerPages] = await Promise.all([
      request(`/threads/${context.query.id}`, { context }),
      fetch("https://schedule.api.nylas.com/manage/pages", {
        headers: { Authorization: `Bearer ${context.account.accessToken}` }
      }).then(response => response.json())
    ]);
    return {
      props: {
        account: context.account,
        serverThread: thread,
        serverSchedulerPages: schedulerPages
      }
    };
  } catch (e) {
    return { props: { errorCode: 404 } };
  }
});

export default function ThreadPage({
  errorCode,
  account,
  serverThread,
  serverSchedulerPages
}) {
  if (errorCode) {
    return <NextError statusCode={errorCode} />;
  }

  const [showReply, setShowReply] = useState(false);
  const [thread, setThread] = useState(serverThread);
  const messages = thread.messages;
  const [schedulerPages, setSchedulerPages] = useState(serverSchedulerPages);
  useEffect(() => {
    setThread(serverThread);
    setSchedulerPages(serverSchedulerPages);
  }, [serverThread]);

  const [formState, setFormState] = useState({
    body: "",
    to: [...messages[0].to, ...messages[0].from]
      .filter(({ email }) => email !== account.emailAddress)
      .map(({ email }) => email)
      .join(", "),
    cc: messages[0].cc
      .filter(({ email }) => email !== account.emailAddress)
      .map(({ email }) => email)
      .join(", "),
    bcc: messages[0].bcc
      .filter(({ email }) => email !== account.emailAddress)
      .map(({ email }) => email)
      .join(", "),
    files: []
  });

  async function triggerSubmit(e) {
    e.preventDefault();
    NProgress.start();

    const toEmails = formState.to
      ? formState.to.split(",").map(cleanEmail)
      : [];
    const ccEmails = formState.cc
      ? formState.cc.split(",").map(cleanEmail)
      : [];
    const bccEmails = formState.bcc
      ? formState.bcc.split(",").map(cleanEmail)
      : [];
    const allEmails = [...toEmails, ...ccEmails, ...bccEmails];

    const invalidEmail = allEmails.find(email => !email.includes("@"));

    if (invalidEmail) {
      NProgress.done();
      return alert(`${invalidEmail} is not a valid email.`);
    }

    if (allEmails.length === 0) {
      NProgress.done();
      return alert(`Please specify at least one recipient.`);
    }

    try {
      await request(`/threads/${thread.id}`, {
        body: {
          to: toEmails,
          cc: ccEmails,
          bcc: bccEmails,
          body: formState.body,
          files: formState.files
        }
      });

      Router.push("/");
    } catch (error) {
      NProgress.done();
      alert(error.error);
    }
  }

  useEffect(() => {
    loadScript(
      "https://schedule.nylas.com/schedule-editor/v1.0/schedule-editor.js"
    );
  }, []);

  return (
    <Layout>
      <Head>
        <title>{thread.subject} - Inbox Zero</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <Header account={account} />
      {showReply ? (
        <ReplySidebar
          triggerSubmit={triggerSubmit}
          state={formState}
          setState={setFormState}
          setShowReply={setShowReply}
        />
      ) : (
        <DetailsSidebar
          account={account}
          thread={thread}
          setThread={setThread}
          setShowReply={setShowReply}
          schedulerPages={schedulerPages}
          setSchedulerPages={setSchedulerPages}
          setState={setFormState}
          state={formState}
        />
      )}
      <Content>
        <Subject unread={thread.unread}>{thread.subject}</Subject>
        {showReply && <ReplyForm state={formState} setState={setFormState} />}
        <Accordion divideTop={showReply}>
          {messages.map(message => (
            <Accordion.Message
              key={message.id}
              id={message.id}
              fromName={message.from[0].name}
              fromEmailAddress={message.from[0].email}
              date={message.date}
              hasAttachments={message.hasAttachments}
              files={message.files}
              body={message.body}
            />
          ))}
        </Accordion>
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
    </Layout>
  );
}

function cleanEmail(str) {
  return str.trim().toLowerCase();
}