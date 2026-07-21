import { Button } from "@opencode-ai/ui/button"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Icon } from "@opencode-ai/ui/icon"
import { Switch } from "@opencode-ai/ui/switch"
import { Tabs } from "@opencode-ai/ui/tabs"
import { ErrorStateV2 } from "@opencode-ai/ui/v2/error-state-v2"
import { SkeletonRowV2 } from "@opencode-ai/ui/v2/skeleton-row-v2"
import { StatusDotV2 } from "@opencode-ai/ui/v2/status-dot-v2"
import { useQuery } from "@tanstack/solid-query"
import { showToast } from "@/utils/toast"
import { useNavigate } from "@solidjs/router"
import { type Accessor, createEffect, createMemo, createSignal, For, type JSXElement, onCleanup, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { ServerHealthIndicator, ServerRow } from "@/components/server/server-row"
import { useLanguage } from "@/context/language"
import { usePlatform } from "@/context/platform"
import { ServerConnection, useServer } from "@/context/server"
import { useServerSync } from "@/context/server-sync"
import { useSync } from "@/context/sync"
import { type ServerHealth } from "@/utils/server-health"
import { useGlobal } from "@/context/global"
import { useMcpToggle } from "@/context/mcp"
import { pathKey } from "@/utils/path-key"
import {
  hasNonBlockingServiceIssue,
  lspStatusTextKey,
  mcpStatusTextKey,
  overallStatusKey,
} from "./status-popover-indicator"

const pluginEmptyMessage = (value: string, file: string): JSXElement => {
  const parts = value.split(file)
  if (parts.length === 1) return value
  return (
    <>
      {parts[0]}
      <code class="bg-surface-raised-base px-1.5 py-0.5 rounded-sm text-text-base">{file}</code>
      {parts.slice(1).join(file)}
    </>
  )
}

const listServersByHealth = (
  list: ServerConnection.Any[],
  active: ServerConnection.Key | undefined,
  status: Record<ServerConnection.Key, ServerHealth | undefined>,
) => {
  if (!list.length) return list
  const order = new Map(list.map((url, index) => [url, index] as const))
  const rank = (value?: ServerHealth) => {
    if (value?.healthy === true) return 0
    if (value?.healthy === false) return 2
    return 1
  }

  return list.slice().sort((a, b) => {
    if (ServerConnection.key(a) === active) return -1
    if (ServerConnection.key(b) === active) return 1
    const diff = rank(status[ServerConnection.key(a)]) - rank(status[ServerConnection.key(b)])
    if (diff !== 0) return diff
    return (order.get(a) ?? 0) - (order.get(b) ?? 0)
  })
}

const useDefaultServerKey = (
  get: (() => string | Promise<string | null | undefined> | null | undefined) | undefined,
) => {
  const [state, setState] = createStore({
    key: undefined as ServerConnection.Key | undefined,
    tick: 0,
  })

  createEffect(() => {
    state.tick
    let dead = false
    const result = get?.()
    if (!result) {
      setState("key", undefined)
      onCleanup(() => {
        dead = true
      })
      return
    }

    if (result instanceof Promise) {
      void result.then((next) => {
        if (dead) return
        setState("key", next ?? undefined)
      })
      onCleanup(() => {
        dead = true
      })
      return
    }

    setState("key", ServerConnection.Key.make(result))
    onCleanup(() => {
      dead = true
    })
  })

  return {
    key: () => {
      return state.key
    },
    refresh: () => setState("tick", (value) => value + 1),
  }
}

type ServerStatusState = {
  servers: () => ServerStatusItem[]
  defaultKey: () => ServerConnection.Key | undefined
  ariaLabel: string
  serversLabel: string
  defaultLabel: string
  manageLabel: string
  onManage: () => void
}

type ServerStatusItem = {
  key: ServerConnection.Key
  conn: ServerConnection.Any
  health?: ServerHealth
  blocked: boolean
  active: boolean
  onSelect: () => void
}

export function StatusPopoverServerBody() {
  const global = useGlobal()
  const server = useServer()
  const platform = usePlatform()
  const dialog = useDialog()
  const language = useLanguage()
  const navigate = useNavigate()
  let dialogRun = 0
  let dialogDead = false
  onCleanup(() => {
    dialogDead = true
    dialogRun += 1
  })

  const sortedServers = createMemo(() => listServersByHealth(global.servers.list(), server.key, global.servers.health))
  const defaultServer = useDefaultServerKey(() => platform.getDefaultServer?.())
  const serverItems = createMemo(() =>
    sortedServers().map((conn) => {
      const key = ServerConnection.key(conn)
      return {
        key,
        conn,
        health: global.servers.health[key],
        blocked: global.servers.health[key]?.healthy === false,
        active: !!server.current && key === ServerConnection.key(server.current),
        onSelect: () => {
          navigate("/")
          queueMicrotask(() => server.setActive(key))
        },
      }
    }),
  )

  return (
    <ServerStatusPopoverView
      state={{
        servers: serverItems,
        defaultKey: defaultServer.key,
        ariaLabel: language.t("status.popover.ariaLabel"),
        serversLabel: language.t("status.popover.tab.servers"),
        defaultLabel: language.t("common.default"),
        manageLabel: language.t("status.popover.action.manageServers"),
        onManage: () => {
          const run = ++dialogRun
          void import("./dialog-select-server").then((x) => {
            if (dialogDead || dialogRun !== run) return
            void dialog.show(() => <x.DialogSelectServer />, defaultServer.refresh)
          })
        },
      }}
    />
  )
}

function ServerStatusPopoverView(props: { state: ServerStatusState }) {
  return (
    <div class="flex items-center gap-1 w-[min(360px,calc(100vw-24px))] rounded-xl shadow-[var(--shadow-lg-border-base)]">
      <Tabs
        aria-label={props.state.ariaLabel}
        class="tabs bg-background-strong rounded-xl overflow-hidden w-full"
        data-component="tabs"
        data-active="servers"
        defaultValue="servers"
        variant="alt"
      >
        <Tabs.List data-slot="tablist" class="bg-transparent border-b-0 px-4 pt-2 pb-0 gap-4 h-10 overflow-x-auto">
          <Tabs.Trigger value="servers" data-slot="tab" class="text-12-regular whitespace-nowrap">
            {props.state.servers().length > 0 ? `${props.state.servers().length} ` : ""}
            {props.state.serversLabel}
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="servers">
          <ServerStatusList state={props.state} />
        </Tabs.Content>
      </Tabs>
    </div>
  )
}

function ServerStatusList(props: { state: ServerStatusState }) {
  return (
    <div class="flex flex-col px-2 pb-2">
      <div class="flex flex-col p-3 bg-background-base rounded-sm min-h-14">
        <For each={props.state.servers()}>
          {(item) => {
            return (
              <button
                type="button"
                class="flex items-center gap-2 w-full h-8 pl-3 pr-1.5 py-1.5 rounded-md transition-colors text-left"
                classList={{
                  "hover:bg-surface-raised-base-hover": !item.blocked,
                  "cursor-not-allowed": item.blocked,
                }}
                aria-disabled={item.blocked}
                onClick={() => {
                  if (item.blocked) return
                  item.onSelect()
                }}
              >
                <ServerHealthIndicator health={item.health} />
                <ServerRow
                  conn={item.conn}
                  dimmed={item.blocked}
                  status={item.health}
                  class="flex items-center gap-2 w-full min-w-0"
                  nameClass="text-14-regular text-text-base truncate"
                  versionClass="text-12-regular text-text-weak truncate"
                  badge={
                    <Show when={item.key === props.state.defaultKey()}>
                      <span class="text-11-regular text-text-base bg-surface-base px-1.5 py-0.5 rounded-md">
                        {props.state.defaultLabel}
                      </span>
                    </Show>
                  }
                >
                  <div class="flex-1" />
                  <Show when={item.active}>
                    <Icon name="check" size="small" class="text-icon-weak shrink-0" />
                  </Show>
                </ServerRow>
              </button>
            )
          }}
        </For>

        <Button variant="secondary" class="mt-3 self-start h-8 px-3 py-1.5" onClick={props.state.onManage}>
          {props.state.manageLabel}
        </Button>
      </div>
    </div>
  )
}

function useDirectoryStatusQueries() {
  const serverSync = useServerSync()
  const sync = useSync()
  const directoryKey = createMemo(() => pathKey(sync().directory))
  const mcpQuery = useQuery(() => serverSync().queryOptions.mcp(directoryKey()))
  const lspQuery = useQuery(() => serverSync().queryOptions.lsp(directoryKey()))
  return { mcpQuery, lspQuery }
}

export function StatusPopoverBody(_props: { shown: Accessor<boolean> }) {
  const sync = useSync()
  const global = useGlobal()
  const server = useServer()
  const platform = usePlatform()
  const dialog = useDialog()
  const language = useLanguage()
  const navigate = useNavigate()
  const { mcpQuery, lspQuery } = useDirectoryStatusQueries()

  const fail = (err: unknown) => {
    showToast({
      variant: "error",
      title: language.t("common.requestFailed"),
      description: err instanceof Error ? err.message : String(err),
    })
  }

  const [activeTab, setActiveTab] = createSignal("overview")

  const sortedServers = createMemo(() => listServersByHealth(global.servers.list(), server.key, global.servers.health))
  const defaultServer = useDefaultServerKey(() => platform.getDefaultServer?.())
  const toggleMcp = useMcpToggle()
  const mcpNames = createMemo(() => Object.keys(sync().data.mcp ?? {}).sort((a, b) => a.localeCompare(b)))
  const mcpStatus = (name: string) => sync().data.mcp?.[name]?.status
  const mcpConnected = createMemo(() => mcpNames().filter((name) => mcpStatus(name) === "connected").length)
  const mcpFailed = createMemo(() => mcpNames().filter((name) => mcpStatus(name) === "failed").length)
  const mcpAuth = createMemo(() => mcpNames().filter((name) => mcpStatus(name) === "needs_auth").length)
  const lspItems = createMemo(() => sync().data.lsp ?? [])
  const lspConnected = createMemo(() => lspItems().filter((item) => item.status === "connected").length)
  const lspFailed = createMemo(() => lspItems().filter((item) => item.status === "error").length)
  const plugins = createMemo(() =>
    (sync().data.config.plugin ?? []).map((item) => (typeof item === "string" ? item : item[0])),
  )
  const pluginCount = createMemo(() => plugins().length)
  const pluginEmpty = createMemo(() => pluginEmptyMessage(language.t("dialog.plugins.empty"), "opencode.json"))
  const servicesReady = createMemo(() => sync().data.mcp_ready && sync().data.lsp_ready)
  const loading = createMemo(() => !servicesReady() && !mcpQuery.isError && !lspQuery.isError)
  const issue = createMemo(() =>
    hasNonBlockingServiceIssue({
      mcp: Object.values(sync().data.mcp ?? {}).map((item) => item.status),
      lsp: lspItems().map((item) => item.status),
    }),
  )
  const serverHealth = createMemo(() => global.servers.health[server.key]?.healthy)
  const overallKey = createMemo(() =>
    overallStatusKey({ serverHealth: serverHealth(), loading: loading(), issue: issue() }),
  )

  const serverItems = createMemo(() =>
    sortedServers().map((conn) => {
      const key = ServerConnection.key(conn)
      return {
        key,
        conn,
        health: global.servers.health[key],
        blocked: global.servers.health[key]?.healthy === false,
        active: !!server.current && key === ServerConnection.key(server.current),
        onSelect: () => {
          navigate("/")
          queueMicrotask(() => server.setActive(key))
        },
      }
    }),
  )

  let dialogRun = 0
  let dialogDead = false
  onCleanup(() => {
    dialogDead = true
    dialogRun += 1
  })

  return (
    <div class="flex items-center gap-1 w-[min(360px,calc(100vw-24px))] rounded-xl shadow-[var(--shadow-lg-border-base)]">
      <Tabs
        aria-label={language.t("status.popover.ariaLabel")}
        class="tabs bg-background-strong rounded-xl overflow-hidden w-full"
        data-component="tabs"
        data-active={activeTab()}
        value={activeTab()}
        onChange={setActiveTab}
        variant="alt"
      >
        <Tabs.List
          data-slot="tablist"
          class="bg-transparent border-b-0 px-4 pt-2 pb-0 gap-4 h-10 overflow-x-auto"
        >
          <Tabs.Trigger value="overview" data-slot="tab" data-action="status-tab-overview" class="text-12-regular whitespace-nowrap">
            {language.t("status.popover.tab.overview")}
          </Tabs.Trigger>
          <Tabs.Trigger value="servers" data-slot="tab" data-action="status-tab-servers" class="text-12-regular whitespace-nowrap">
            {global.servers.list().length > 0 ? `${global.servers.list().length} ` : ""}
            {language.t("status.popover.tab.servers")}
          </Tabs.Trigger>
          <Tabs.Trigger value="mcp" data-slot="tab" data-action="status-tab-mcp" class="text-12-regular whitespace-nowrap">
            {mcpNames().length > 0 ? `${mcpConnected()}/${mcpNames().length} ` : ""}
            {language.t("status.popover.tab.mcp")}
          </Tabs.Trigger>
          <Tabs.Trigger value="lsp" data-slot="tab" data-action="status-tab-lsp" class="text-12-regular whitespace-nowrap">
            {lspItems().length > 0 ? `${lspConnected()}/${lspItems().length} ` : ""}
            {language.t("status.popover.tab.lsp")}
          </Tabs.Trigger>
          <Tabs.Trigger value="plugins" data-slot="tab" data-action="status-tab-plugins" class="text-12-regular whitespace-nowrap">
            {pluginCount() > 0 ? `${pluginCount()} ` : ""}
            {language.t("status.popover.tab.plugins")}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview">
          <div class="flex flex-col px-2 pb-2">
            <div class="flex flex-col p-3 bg-background-base rounded-sm min-h-14 gap-2">
              <div class="flex items-center gap-2">
                <StatusDotV2
                  status={
                    serverHealth() === false
                      ? "failed"
                      : !servicesReady() || serverHealth() === undefined
                        ? "muted"
                        : issue()
                          ? "degraded"
                          : "healthy"
                  }
                  size="normal"
                />
                <span class="text-14-semibold text-text-base">{language.t(overallKey())}</span>
              </div>
              <Show when={server.current}>
                <button
                  type="button"
                  class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-surface-raised-base-hover transition-colors text-left"
                  onClick={() => setActiveTab("servers")}
                  data-action="status-overview-server"
                >
                  <Icon name="server" size="small" class="text-icon-weak shrink-0" />
                  <span class="text-14-regular text-text-base truncate">{server.name}</span>
                </button>
              </Show>
              <button
                type="button"
                class="flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded-md hover:bg-surface-raised-base-hover transition-colors text-left"
                onClick={() => setActiveTab("mcp")}
                data-action="status-overview-mcp"
              >
                <span class="text-14-regular text-text-base">{language.t("status.popover.overview.mcp")}</span>
                <span class="text-12-regular text-text-weak">
                  {mcpConnected()}/{mcpNames().length}
                  <Show when={mcpFailed() > 0}>
                    {" "}
                    <span class="text-icon-critical-base">({mcpFailed()} {language.t("status.popover.status.failed")})</span>
                  </Show>
                  <Show when={mcpAuth() > 0 && mcpFailed() === 0}>
                    {" "}
                    <span class="text-icon-warning-base">({mcpAuth()} {language.t("status.popover.status.needsAuth")})</span>
                  </Show>
                </span>
              </button>
              <button
                type="button"
                class="flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded-md hover:bg-surface-raised-base-hover transition-colors text-left"
                onClick={() => setActiveTab("lsp")}
                data-action="status-overview-lsp"
              >
                <span class="text-14-regular text-text-base">{language.t("status.popover.overview.lsp")}</span>
                <span class="text-12-regular text-text-weak">
                  {lspConnected()}/{lspItems().length}
                  <Show when={lspFailed() > 0}>
                    {" "}
                    <span class="text-icon-critical-base">({lspFailed()} {language.t("status.popover.status.failed")})</span>
                  </Show>
                </span>
              </button>
              <button
                type="button"
                class="flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded-md hover:bg-surface-raised-base-hover transition-colors text-left"
                onClick={() => setActiveTab("plugins")}
                data-action="status-overview-plugins"
              >
                <span class="text-14-regular text-text-base">{language.t("status.popover.overview.plugins")}</span>
                <span class="text-12-regular text-text-weak">{pluginCount()}</span>
              </button>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="servers">
          <div class="flex flex-col px-2 pb-2">
            <div class="flex flex-col p-3 bg-background-base rounded-sm min-h-14">
              <For each={serverItems()}>
                {(s) => {
                  const key = ServerConnection.key(s.conn)
                  const blocked = () => global.servers.health[key]?.healthy === false
                  return (
                    <button
                      type="button"
                      class="flex items-center gap-2 w-full h-8 pl-3 pr-1.5 py-1.5 rounded-md transition-colors text-left"
                      classList={{
                        "hover:bg-surface-raised-base-hover": !blocked(),
                        "cursor-not-allowed": blocked(),
                      }}
                      aria-disabled={blocked()}
                      onClick={() => {
                        if (blocked()) return
                        navigate("/")
                        queueMicrotask(() => server.setActive(key))
                      }}
                    >
                      <ServerHealthIndicator health={global.servers.health[key]} />
                      <ServerRow
                        conn={s.conn}
                        dimmed={blocked()}
                        status={global.servers.health[key]}
                        class="flex items-center gap-2 w-full min-w-0"
                        nameClass="text-14-regular text-text-base truncate"
                        versionClass="text-12-regular text-text-weak truncate"
                        badge={
                          <Show when={key === defaultServer.key()}>
                            <span class="text-11-regular text-text-base bg-surface-base px-1.5 py-0.5 rounded-md">
                              {language.t("common.default")}
                            </span>
                          </Show>
                        }
                      >
                        <div class="flex-1" />
                        <Show when={server.current && key === ServerConnection.key(server.current)}>
                          <Icon name="check" size="small" class="text-icon-weak shrink-0" />
                        </Show>
                      </ServerRow>
                    </button>
                  )
                }}
              </For>

              <Button
                variant="secondary"
                class="mt-3 self-start h-8 px-3 py-1.5"
                onClick={() => {
                  const run = ++dialogRun
                  void import("./dialog-select-server").then((x) => {
                    if (dialogDead || dialogRun !== run) return
                    void dialog.show(() => <x.DialogSelectServer />, defaultServer.refresh)
                  })
                }}
              >
                {language.t("status.popover.action.manageServers")}
              </Button>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="mcp">
          <div class="flex flex-col px-2 pb-2">
            <div class="flex flex-col p-3 bg-background-base rounded-sm min-h-14">
              <Show when={!mcpQuery.isLoading || mcpNames().length > 0} fallback={<StatusLoadingSkeleton />}>
                <Show
                  when={!mcpQuery.isError}
                  fallback={
                    <StatusErrorState
                      title={language.t("status.popover.error.title")}
                      description={language.t("status.popover.error.description")}
                      retryLabel={language.t("status.popover.retry")}
                      onRetry={() => mcpQuery.refetch().catch(fail)}
                    />
                  }
                >
                  <Show
                    when={mcpNames().length > 0}
                    fallback={
                      <div class="text-14-regular text-text-base text-center my-auto" data-action="status-mcp-empty">
                        {language.t("dialog.mcp.empty")}
                      </div>
                    }
                  >
                    <For each={mcpNames()}>
                      {(name) => {
                        const status = () => mcpStatus(name)
                        const enabled = () => status() === "connected"
                        return (
                          <button
                            type="button"
                            class="flex items-center gap-2 w-full min-h-8 pl-3 pr-2 py-1 rounded-md hover:bg-surface-raised-base-hover transition-colors text-left"
                            onClick={() => {
                              if (toggleMcp.isPending) return
                              toggleMcp.mutate(name)
                            }}
                            disabled={toggleMcp.isPending && toggleMcp.variables === name}
                            aria-busy={toggleMcp.isPending && toggleMcp.variables === name}
                          >
                            <StatusDotV2
                              status={
                                status() === "connected"
                                  ? "healthy"
                                  : status() === "failed"
                                    ? "failed"
                                    : status() === "disabled"
                                      ? "muted"
                                      : "degraded"
                              }
                              size="small"
                            />
                            <span class="flex flex-col min-w-0 flex-1">
                              <span class="flex items-center gap-2 min-w-0">
                                <span class="text-14-regular text-text-base truncate">{name}</span>
                              </span>
                              <Show when={status() !== "connected"}>
                                <span class="text-11-regular text-text-weaker truncate">
                                  {language.t(mcpStatusTextKey(status() ?? "disabled"))}
                                </span>
                              </Show>
                            </span>
                            <div onClick={(event) => event.stopPropagation()}>
                              <Switch
                                checked={enabled()}
                                disabled={toggleMcp.isPending && toggleMcp.variables === name}
                                onChange={() => {
                                  if (toggleMcp.isPending) return
                                  toggleMcp.mutate(name)
                                }}
                              />
                            </div>
                          </button>
                        )
                      }}
                    </For>
                  </Show>
                </Show>
              </Show>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="lsp">
          <div class="flex flex-col px-2 pb-2">
            <div class="flex flex-col p-3 bg-background-base rounded-sm min-h-14">
              <Show when={!lspQuery.isLoading || lspItems().length > 0} fallback={<StatusLoadingSkeleton />}>
                <Show
                  when={!lspQuery.isError}
                  fallback={
                    <StatusErrorState
                      title={language.t("status.popover.error.title")}
                      description={language.t("status.popover.error.description")}
                      retryLabel={language.t("status.popover.retry")}
                      onRetry={() => lspQuery.refetch().catch(fail)}
                    />
                  }
                >
                  <Show
                    when={lspItems().length > 0}
                    fallback={
                      <div class="text-14-regular text-text-base text-center my-auto" data-action="status-lsp-empty">
                        {language.t("dialog.lsp.empty")}
                      </div>
                    }
                  >
                    <For each={lspItems()}>
                      {(item) => (
                        <div class="flex items-center gap-2 w-full min-h-8 px-2 py-1">
                          <StatusDotV2 status={item.status === "connected" ? "healthy" : "failed"} size="small" />
                          <span class="flex flex-col min-w-0">
                            <span class="text-14-regular text-text-base truncate">{item.name || item.id}</span>
                            <span class="text-11-regular text-text-weaker truncate">
                              {language.t(lspStatusTextKey(item.status))}
                            </span>
                          </span>
                        </div>
                      )}
                    </For>
                  </Show>
                </Show>
              </Show>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="plugins">
          <div class="flex flex-col px-2 pb-2">
            <div class="flex flex-col p-3 bg-background-base rounded-sm min-h-14">
              <Show
                when={plugins().length > 0}
                fallback={<div class="text-14-regular text-text-base text-center my-auto">{pluginEmpty()}</div>}
              >
                <For each={plugins()}>
                  {(plugin) => (
                    <div class="flex items-center gap-2 w-full min-h-8 px-2 py-1">
                      <StatusDotV2 status="healthy" size="small" />
                      <span class="text-14-regular text-text-base truncate">{plugin}</span>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>
        </Tabs.Content>
      </Tabs>
    </div>
  )
}

export function StatusLoadingSkeleton() {
  return (
    <div class="flex flex-col gap-2 p-2" data-action="status-loading">
      <SkeletonRowV2 />
      <SkeletonRowV2 />
    </div>
  )
}

export function StatusErrorState(props: { title: string; description: string; retryLabel: string; onRetry: () => void }) {
  return (
    <ErrorStateV2
      title={props.title}
      description={props.description}
      retryLabel={props.retryLabel}
      onRetry={props.onRetry}
      data-action="status-error"
    />
  )
}
