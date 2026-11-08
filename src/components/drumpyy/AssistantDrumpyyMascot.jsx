import { useId } from "react";
import useAnimationActivity from "../../hooks/useAnimationActivity";
import { ASSISTANT_POSES } from "./assistantAnimation";
import "./assistantDrumpyy.css";

// Independent vector rig: head, eyes, pupils, upper/lower beak, wings and cap
// tassel move separately. No original sprite or mascot asset is overwritten.
export default function AssistantDrumpyyMascot({ pose = "idle", className = "", paused = false }) {
  const id = useId().replace(/:/g, "");
  const activity = useAnimationActivity(paused);
  const state = ASSISTANT_POSES.includes(pose) ? pose : "idle";
  const feather = `url(#${id}-feather)`;
  const gold = `url(#${id}-gold)`;
  const thinking = state === "thinking";
  const concerned = state === "error" || state === "confused";
  const sleeping = state === "sleeping";
  const celebrating = state === "celebrating";

  return (
    <div ref={activity.elementRef} role="img" aria-label={`Drumpyy ${state}`} data-assistant-mascot
      data-drumpyy-pose={state} data-animation-paused={activity.paused}
      data-reduced-motion={activity.reduceMotion} className={`assistant-drumpyy ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 200 220" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id={`${id}-feather`} x1="40" y1="50" x2="150" y2="193" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9770ff" /><stop offset=".5" stopColor="#6540f5" /><stop offset="1" stopColor="#313bbf" />
          </linearGradient>
          <linearGradient id={`${id}-gold`} x1="70" y1="110" x2="116" y2="165" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff378" /><stop offset=".5" stopColor="#ffcc27" /><stop offset="1" stopColor="#f29a16" />
          </linearGradient>
          <linearGradient id={`${id}-cap`} x1="42" y1="12" x2="149" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#435dba" /><stop offset="1" stopColor="#142456" />
          </linearGradient>
        </defs>

        <g className="rig-character" stroke="#262459" strokeWidth="2.4" strokeLinejoin="round">
          <g className="rig-body">
            <path d="M57 148 Q42 154 46 185 L60 192 L146 190 Q160 157 142 145 Z" fill="#139ab0" />
            <path d="M81 191 Q70 199 64 203 Q64 208 75 207 L89 202 L93 191 M116 191 Q130 199 136 203 Q136 208 125 207 L111 202 L108 191" fill={gold} />
            <path d="M73 132 Q99 118 127 135 Q142 155 137 184 Q128 202 100 202 Q71 201 63 183 Q58 155 73 132 Z" fill={feather} />
            <path d="M79 148 Q101 137 123 150 L126 173 Q122 188 101 193 Q78 187 75 172 Z" fill="#baa0ff" stroke="none" />
            <path d="M84 171 L93 181 L99 175 L107 184 L114 177" stroke="#7e60d6" strokeWidth="2" strokeLinecap="round" />
            <path d="M66 144 L77 155 M137 145 L125 156" stroke="#35cad1" strokeWidth="7" strokeLinecap="round" />
            <g className="rig-wing rig-wing-left" visibility={thinking ? "hidden" : undefined}>
              <path d={thinking
                ? "M67 150 Q42 137 52 121 Q64 111 86 117 L94 124 Q88 135 74 138 L74 151 Z"
                : "M67 142 Q43 143 34 170 L29 181 L44 178 L40 188 Q66 182 75 151 Z"} fill={feather} />
              <path d={thinking ? "M58 124 Q70 120 86 124 L80 133 Q68 138 59 134 Z" : "M48 158 L35 176 L48 170 L46 181 Q59 174 64 163 Z"} fill={gold} strokeWidth="1.5" />
            </g>

          </g>
          <g className="rig-head">
            <path d="M61 62 Q36 72 33 98 L26 111 L35 113 L29 128 L39 127 Q42 147 62 155 L59 162 L75 159 Q100 175 126 158 L142 162 L140 155 Q159 146 163 128 L173 130 L166 115 L175 112 L166 96 Q160 64 135 59 L140 49 L125 54 L123 44 L104 55 Q79 49 61 62 Z" fill={feather} />
            <path d="M41 122 Q48 145 73 149 L72 141 Q61 122 44 117 M156 119 Q146 129 135 146 L138 150 Q159 142 160 126 Z" fill="#b99aff" stroke="none" />
            <g className="rig-eyes" strokeWidth="1.7" visibility={sleeping ? "hidden" : undefined}>
              <ellipse cx="70" cy="100" rx="25" ry="30" fill="#fff7ff" />
              <ellipse cx="131" cy="100" rx="23" ry="29" fill="#fff7ff" />
              <g className="rig-pupils">
                <ellipse cx="75" cy="106" rx="16" ry="22" fill="#b26a28" />
                <ellipse cx="127" cy="106" rx="15" ry="21" fill="#b26a28" />
                <ellipse cx="77" cy="108" rx="11" ry="17" fill="#191c35" stroke="none" />
                <ellipse cx="125" cy="108" rx="10" ry="16" fill="#191c35" stroke="none" />
                <ellipse cx="80" cy="96" rx="5.5" ry="7" fill="white" stroke="none" />
                <ellipse cx="128" cy="97" rx="5" ry="6" fill="white" stroke="none" />
                <circle cx="70" cy="118" r="2.4" fill="#ffd488" stroke="none" />
                <circle cx="120" cy="118" r="2" fill="#ffd488" stroke="none" />
              </g>
            </g>
            {sleeping && <path className="rig-sleep-eyes" d="M51 102 Q69 117 87 102 M115 102 Q132 116 147 101" stroke="#262459" strokeWidth="4" strokeLinecap="round" />}
            <path className="rig-brows" d={concerned ? "M49 76 Q66 75 83 66 M116 66 Q134 72 147 77" : "M49 75 Q64 62 83 73 M116 72 Q134 62 147 75"} stroke="#352165" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="48" cy="133" rx="8" ry="4" fill="#f5a3db" opacity=".55" stroke="none" />
            <ellipse cx="152" cy="132" rx="7" ry="4" fill="#f5a3db" opacity=".55" stroke="none" />
            <g className="rig-lower-beak">
              <path d="M84 132 Q103 123 121 132 Q117 162 103 165 Q88 160 84 132 Z" fill="#e99414" />
              <path d="M89 135 Q104 139 117 134 Q113 153 104 155 Q94 152 89 135 Z" fill="#682344" stroke="none" />
              <path d="M97 149 Q106 143 112 151 L104 156 Z" fill="#ff778c" stroke="none" />
            </g>
            <path d="M80 126 Q81 111 95 109 Q107 103 117 114 Q124 121 122 132 Q103 145 80 126 Z" fill={gold} />
            <path d="M89 116 Q96 111 99 115" stroke="#fff7a0" strokeWidth="3" strokeLinecap="round" />
            <path d="M92 124 Q103 130 115 125" stroke="#925629" strokeWidth="1.7" strokeLinecap="round" />
            <g className="rig-cap" visibility={celebrating ? "hidden" : undefined}>
              <path d="M58 45 L58 61 Q100 43 145 61 L146 44 Z" fill="#18295c" />
              <path d="M21 35 L105 8 L180 35 L103 66 Z" fill={`url(#${id}-cap)`} />
              <path d="M28 34 L105 13 L173 35" stroke="#8dabff" strokeWidth="3" strokeLinecap="round" />
              <path d="M59 57 Q102 39 142 56" stroke="#5271c5" strokeWidth="2" />
              <g className="rig-tassel" stroke="#a66513" strokeWidth="1.8">
                <path d="M106 26 Q65 27 40 46 L37 69" stroke="#ffd647" strokeWidth="3.5" />
                <circle cx="37" cy="66" r="4" fill="#ffda4c" />
                <path d="M35 69 L29 88 Q36 94 44 89 L39 69 Z" fill={gold} />
                <path d="M36 73 L34 86 M39 74 L39 87" stroke="#fff18b" strokeWidth="1.3" />
              </g>
            </g>
            {celebrating && <g className="rig-party-hat">
              <path d="M66 61 L102 0 L142 61 Q105 75 66 61 Z" fill="#ff7dc5" />
              <path d="M83 32 L125 43 M76 46 L134 58" stroke="#ffe478" strokeWidth="8" />
              <path d="M64 61 Q103 77 144 61" stroke="#6fe8da" strokeWidth="8" strokeLinecap="round" />
              <path d="M102 -8 L105 -2 L112 0 L106 5 L107 12 L101 8 L95 12 L96 5 L91 0 L98 -2 Z" fill="#ffe478" />
            </g>}
          </g>
            <g className="rig-wing rig-wing-right">
              <path d="M131 142 Q158 145 169 173 L173 182 L158 178 L162 188 Q136 182 125 152 Z" fill={feather} />
              <path d="M151 158 L168 177 L153 170 L157 181 Q143 175 138 163 Z" fill={gold} strokeWidth="1.5" />
            </g>
          {thinking && (
            <g className="rig-wing rig-wing-left">
              <path d="M67 150 Q42 137 52 121 Q64 111 86 117 L94 124 Q88 135 74 138 L74 151 Z" fill={feather} />
              <path d="M58 124 Q70 120 86 124 L80 133 Q68 138 59 134 Z" fill={gold} strokeWidth="1.5" />
            </g>
          )}
        </g>
        {state === "greeting" && <text className="rig-hello" x="167" y="48" textAnchor="middle" fill="#7c3aed" fontSize="28" fontWeight="800">Hi!</text>}
        {sleeping && <g className="rig-snooze" fill="#8b5cf6" fontWeight="800">
          <text x="157" y="67" fontSize="18">z</text><text x="170" y="44" fontSize="23">z</text><text x="180" y="17" fontSize="29">Z</text>
        </g>}
        {state === "confused" && <text className="rig-question-mark" x="170" y="65" fill="#8b5cf6" fontSize="36" fontWeight="800">?</text>}
        {state === "proud" && <path className="rig-proud-star" d="M169 22 L174 34 L187 35 L177 44 L180 57 L169 50 L158 57 L161 44 L151 35 L164 34 Z" fill="#facc15" stroke="#d58a13" strokeWidth="2" />}
        {state === "error" && <g className="rig-error-mark" stroke="#ef9461" strokeWidth="5" strokeLinecap="round"><path d="M179 60 L179 78 M179 89 L179 90" /></g>}
        {celebrating && <g className="rig-confetti">
          {Array.from({ length: 18 }, (_, i) => <rect key={i} className="rig-confetti-piece"
            x={10 + (i * 43) % 180} y={5 + (i * 29) % 95} width="5" height="10" rx="1"
            fill={["#ff7dc5", "#facc15", "#2dd4bf", "#a78bfa", "#60a5fa"][i % 5]}
            style={{ animationDelay: `${-(i % 7) * 0.19}s`, "--confetti-drift": `${i % 2 ? 18 : -18}px` }} />)}
        </g>}
      </svg>
    </div>
  );
}
