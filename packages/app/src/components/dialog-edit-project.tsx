import { Button } from "@opencode-ai/ui/button"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Dialog } from "@opencode-ai/ui/dialog"
import { TextField } from "@opencode-ai/ui/text-field"
import { useMutation } from "@tanstack/solid-query"
import { Icon } from "@opencode-ai/ui/icon"
import { createMemo, createSignal, For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { type LocalProject, getAvatarColors } from "@/context/layout"
import { getFilename } from "@opencode-ai/core/util/path"
import { Avatar } from "@opencode-ai/ui/avatar"
import { useLanguage } from "@/context/language"
import { getProjectAvatarSource } from "@/pages/layout/helpers"
import { ServerConnection } from "@/context/server"
import { useGlobal } from "@/context/global"

const AVATAR_COLOR_KEYS = ["pink", "mint", "orange", "purple", "cyan", "lime"] as const

// ponytail: explicit allowlist + 1 MiB client raw-file limit; reject SVG and
// MIME/extension mismatch. Defense against F4 (oversized data URIs crashing
// the server) and XSS via SVG. Pre-Filereader validation is mandatory — the
// data URI is stored verbatim in SQLite, so an unchecked SVG would render in
// <img src> with no sanitization.
const ALLOWED_ICON_MIME: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
}
const MAX_ICON_BYTES = 1024 * 1024 // 1 MiB

function validateIconFile(file: File): { ok: true } | { ok: false; reason: string } {
  if (!file || file.size === 0) return { ok: false, reason: "empty" }
  if (file.size > MAX_ICON_BYTES) return { ok: false, reason: "size" }
  const mime = file.type.toLowerCase()
  // Explicit allowlist — "image/*" is too permissive (SVG passes it).
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_ICON_MIME, mime)) return { ok: false, reason: "type" }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!ALLOWED_ICON_MIME[mime].includes(ext)) return { ok: false, reason: "mismatch" }
  return { ok: true }
}

export function DialogEditProject(props: { project: LocalProject; server: ServerConnection.Any }) {
  const dialog = useDialog()
  const global = useGlobal()
  const language = useLanguage()
  const serverCtx = createMemo(() => global.createServerCtx(props.server))
  const serverSDK = () => serverCtx().sdk
  const serverSync = () => serverCtx().sync

  const folderName = createMemo(() => getFilename(props.project.worktree))
  const defaultName = createMemo(() => props.project.name || folderName())

  const [store, setStore] = createStore({
    name: defaultName(),
    color: props.project.icon?.color,
    iconOverride: props.project.icon?.override,
    startup: props.project.commands?.start ?? "",
    dragOver: false,
    iconHover: false,
  })

  // ponytail: separate signal for validation errors so the form does not
  // pretend a rejected file was selected. Cleared on next successful select.
  const [iconError, setIconError] = createSignal<string | null>(null)

  let iconInput: HTMLInputElement | undefined

  function handleFileSelect(file: File) {
    setIconError(null)
    const result = validateIconFile(file)
    if (!result.ok) {
      setIconError(result.reason)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setStore("iconOverride", e.target?.result as string)
      setStore("iconHover", false)
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setStore("dragOver", false)
    const file = e.dataTransfer?.files[0]
    if (file) handleFileSelect(file)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setStore("dragOver", true)
  }

  function handleDragLeave() {
    setStore("dragOver", false)
  }

  function handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) handleFileSelect(file)
  }

  function clearIcon() {
    setStore("iconOverride", "")
  }

  const saveMutation = useMutation(() => ({
    mutationFn: async () => {
      const name = store.name.trim() === folderName() ? "" : store.name.trim()
      const start = store.startup.trim()
      // ponytail: only send fields that the user actually changed in this
      // dialog. Sending empty strings would clobber the server-side icon
      // (e.g. auto-assign-color racing the dialog save).
      const iconPayload: { color?: string; override?: string } = {}
      if (store.color) iconPayload.color = store.color
      if (store.iconOverride) iconPayload.override = store.iconOverride
      const iconForMeta: { color?: string; override?: string } = {}
      if (store.color) iconForMeta.color = store.color
      if (store.iconOverride) iconForMeta.override = store.iconOverride

      if (props.project.id && props.project.id !== "global") {
        // ponytail: PATCH errors must keep the dialog open so the previous
        // valid icon stays visible. Success closes only after the server's
        // authoritative state is accepted.
        const res = await serverSDK().client.project.update({
          projectID: props.project.id,
          directory: props.project.worktree,
          name,
          icon: iconPayload,
          commands: { start },
        })
        if (res.error) throw new Error(String(res.error))
        const serverOverride = (res.data as { icon?: { override?: string } } | undefined)?.icon?.override
        serverSync().project.icon(props.project.worktree, serverOverride ?? undefined)
        dialog.close()
        return
      }

      serverSync().project.meta(props.project.worktree, {
        name,
        icon: iconForMeta,
        commands: { start: start || undefined },
      })
      dialog.close()
    },
    onError: (err) => {
      // ponytail: keep dialog open on PATCH failure; surface the error so the
      // user can retry. Previous valid icon is unchanged in the form store.
      console.error("project.update failed", err)
    },
  }))

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (saveMutation.isPending) return
    saveMutation.mutate()
  }

  return (
    <Dialog title={language.t("dialog.project.edit.title")} class="w-full max-w-[480px] mx-auto">
      <form onSubmit={handleSubmit} class="flex flex-col gap-6 p-6 pt-0">
        <div class="flex flex-col gap-4">
          <TextField
            autofocus
            type="text"
            label={language.t("dialog.project.edit.name")}
            placeholder={folderName()}
            value={store.name}
            onChange={(v) => setStore("name", v)}
          />

          <div class="flex flex-col gap-2">
            <label class="text-12-medium text-text-weak">{language.t("dialog.project.edit.icon")}</label>
            <div class="flex gap-3 items-start">
              <div
                class="relative"
                onMouseEnter={() => setStore("iconHover", true)}
                onMouseLeave={() => setStore("iconHover", false)}
              >
                <div
                  class="relative size-16 rounded-md transition-colors cursor-pointer"
                  classList={{
                    "border-text-interactive-base bg-surface-info-base/20": store.dragOver,
                    "border-border-base hover:border-border-strong": !store.dragOver,
                    "overflow-hidden": !!store.iconOverride,
                  }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => {
                    if (store.iconOverride && store.iconHover) {
                      clearIcon()
                    } else {
                      iconInput?.click()
                    }
                  }}
                >
                  <Show
                    when={getProjectAvatarSource(props.project.id, {
                      color: store.color,
                      url: props.project.icon?.url,
                      override: store.iconOverride,
                    })}
                    fallback={
                      <div class="size-full flex items-center justify-center">
                        <Avatar
                          fallback={store.name || defaultName()}
                          {...getAvatarColors(store.color)}
                          class="size-full text-[32px]"
                        />
                      </div>
                    }
                  >
                    {(src) => (
                      <img
                        src={src()}
                        alt={language.t("dialog.project.edit.icon.alt")}
                        class="size-full object-cover"
                      />
                    )}
                  </Show>
                </div>
                <div
                  class="absolute inset-0 size-16 bg-surface-raised-stronger-non-alpha/90 rounded-[6px] z-10 pointer-events-none flex items-center justify-center transition-opacity"
                  classList={{
                    "opacity-100": store.iconHover && !store.iconOverride,
                    "opacity-0": !(store.iconHover && !store.iconOverride),
                  }}
                >
                  <Icon name="cloud-upload" size="large" class="text-icon-on-interactive-base drop-shadow-sm" />
                </div>
                <div
                  class="absolute inset-0 size-16 bg-surface-raised-stronger-non-alpha/90 rounded-[6px] z-10 pointer-events-none flex items-center justify-center transition-opacity"
                  classList={{
                    "opacity-100": store.iconHover && !!store.iconOverride,
                    "opacity-0": !(store.iconHover && !!store.iconOverride),
                  }}
                >
                  <Icon name="trash" size="large" class="text-icon-on-interactive-base drop-shadow-sm" />
                </div>
              </div>
              <input
                id="icon-upload"
                ref={(el) => {
                  iconInput = el
                }}
                type="file"
                // ponytail: explicit accept list — drops SVG (no sanitization
                // contract) and matches the validation allowlist below.
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                class="hidden"
                onChange={handleInputChange}
              />
              <div class="flex flex-col gap-1.5 text-12-regular text-text-weak self-center">
                <span>{language.t("dialog.project.edit.icon.hint")}</span>
                <span>{language.t("dialog.project.edit.icon.recommended")}</span>
                <Show when={iconError()}>
                  <span class="text-12-medium text-text-on-critical-base" data-testid="icon-validation-error">
                    {language.t(`dialog.project.edit.icon.error.${iconError()}`)}
                  </span>
                </Show>
              </div>
            </div>
          </div>

          <Show when={!store.iconOverride}>
            <div class="flex flex-col gap-2">
              <label class="text-12-medium text-text-weak">{language.t("dialog.project.edit.color")}</label>
              <div class="flex gap-1.5">
                <For each={AVATAR_COLOR_KEYS}>
                  {(color) => (
                    <button
                      type="button"
                      aria-label={language.t("dialog.project.edit.color.select", { color })}
                      aria-pressed={store.color === color}
                      classList={{
                        "flex items-center justify-center size-10 p-0.5 rounded-lg overflow-hidden transition-colors cursor-default": true,
                        "bg-transparent border-2 border-icon-strong-base hover:bg-surface-base-hover":
                          store.color === color,
                        "bg-transparent border border-transparent hover:bg-surface-base-hover hover:border-border-weak-base":
                          store.color !== color,
                      }}
                      onClick={() => {
                        if (store.color === color && !props.project.icon?.url) return
                        setStore("color", store.color === color ? undefined : color)
                      }}
                    >
                      <Avatar
                        fallback={store.name || defaultName()}
                        {...getAvatarColors(color)}
                        class="size-full rounded"
                      />
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <TextField
            multiline
            label={language.t("dialog.project.edit.worktree.startup")}
            description={language.t("dialog.project.edit.worktree.startup.description")}
            placeholder={language.t("dialog.project.edit.worktree.startup.placeholder")}
            value={store.startup}
            onChange={(v) => setStore("startup", v)}
            spellcheck={false}
            class="max-h-14 w-full overflow-y-auto font-mono text-xs"
          />
        </div>

        <div class="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="large" onClick={() => dialog.close()}>
            {language.t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary" size="large" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? language.t("common.saving") : language.t("common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
