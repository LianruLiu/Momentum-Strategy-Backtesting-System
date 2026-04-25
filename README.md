# Momentum-Strategy-Backtesting-System
一个零依赖的动量策略回测小系统，覆盖：

拉取股票日线数据
动量策略回测
年化收益率
Sharpe Ratio
Max Drawdown
策略与 Buy & Hold 可视化曲线
CSV 导入与演示数据兜底
使用方式
直接在浏览器打开：

momentum-backtester/index.html
输入股票代码、日期、动量窗口、交易成本和无风险利率后点击“运行回测”。

数据源
应用会按顺序尝试：

Yahoo Finance chart API
Stooq CSV API
本地生成的演示数据
如果浏览器或网络环境阻止跨域请求，系统会自动切换到演示数据。也可以导入本地 CSV，至少需要包含 Date 和 Close 两列。

策略逻辑
动量定义：

momentum = close[t] / close[t - lookback] - 1
仓位规则：

momentum > threshold => long 1
otherwise => cash 0
策略收益使用上一交易日仓位，并在仓位变化时扣除交易成本。
